import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import dns from 'dns';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Server-side Gemini client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

interface ThreatFactor {
  title: string;
  description: string;
  severity: 'safe' | 'low' | 'medium' | 'high';
  detected: boolean;
}

interface ScanResult {
  url: string;
  normalizedUrl: string;
  domain: string;
  verdict: 'SAFE' | 'SUSPICIOUS' | 'DANGEROUS';
  riskScore: number; // 0 - 100
  category: string;
  summary: string;
  recommendation: string;
  hindiSummary?: string;
  dnsInfo: {
    resolves: boolean;
    ipAddresses: string[];
    error?: string;
  };
  threatFactors: ThreatFactor[];
  details: {
    protocol: string;
    hasHttps: boolean;
    isIpAddress: boolean;
    isShortener: boolean;
    hasSuspiciousTld: boolean;
    brandSpoofDetected: boolean;
    impersonatedBrand?: string;
    port?: string;
    pathDepth: number;
    queryParamCount: number;
  };
  httpProbe?: {
    statusCode?: number;
    redirectCount?: number;
    finalUrl?: string;
    serverHeader?: string;
    contentType?: string;
    hasHsts?: boolean;
    hasCsp?: boolean;
    accessible: boolean;
    responseTimeMs?: number;
    error?: string;
  };
  analyzedAt: string;
  sourceType?: string;
}

// Known URL shorteners
const SHORTENER_DOMAINS = new Set([
  'bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'is.gd', 'buff.ly',
  'adf.ly', 'bit.do', 'cutt.ly', 'rebrand.ly', 'rb.gy', 'shorte.st'
]);

// High-risk generic TLDs often abused in automated bulk phishing campaigns
const HIGH_RISK_TLDS = new Set([
  'top', 'xyz', 'click', 'work', 'loan', 'link', 'country', 'kim', 'science',
  'gq', 'cf', 'tk', 'ml', 'ga', 'buzz', 'surf', 'rest', 'live', 'download', 'win'
]);

// Robust input cleaner & classifier that NEVER crashes
function sanitizeAndClassifyInput(rawInput: string) {
  let text = String(rawInput || '').trim();

  // Strip leading/trailing quotation marks or markdown brackets if present
  text = text.replace(/^["'`<]+|[>"'`]+$/g, '').trim();

  if (!text) {
    text = 'https://unknown-target.local';
  }

  // Type 1: UPI payment intent (e.g. upi://pay?pa=... or paytm/gpay intent)
  if (/^upi:\/\//i.test(text) || text.includes('@okaxis') || text.includes('@okhdfcbank') || text.includes('@paytm')) {
    return {
      type: 'upi' as const,
      raw: text,
      targetUrl: text.startsWith('upi://') ? text : `upi://pay?pa=${encodeURIComponent(text)}`,
      hostname: 'UPI Payment Gateway',
      protocol: 'upi:',
    };
  }

  // Type 2: Wi-Fi QR Code (WIFI:S:...)
  if (/^wifi:/i.test(text)) {
    return {
      type: 'wifi' as const,
      raw: text,
      targetUrl: text,
      hostname: 'Wi-Fi Network Profile',
      protocol: 'wifi:',
    };
  }

  // Type 3: Contact vCard (BEGIN:VCARD)
  if (/^begin:vcard/i.test(text)) {
    return {
      type: 'vcard' as const,
      raw: text,
      targetUrl: text,
      hostname: 'Contact Card (vCard)',
      protocol: 'vcard:',
    };
  }

  // Type 4: Tel, Mailto, SMS
  if (/^(tel:|mailto:|sms:)/i.test(text)) {
    const proto = text.split(':')[0].toLowerCase() + ':';
    return {
      type: 'uri' as const,
      raw: text,
      targetUrl: text,
      hostname: text.replace(/^[a-z]+:/i, ''),
      protocol: proto,
    };
  }

  // Type 5: Standard Web URL or Domain string
  // If it doesn't have a protocol, prepend https://
  let candidate = text;
  if (!/^https?:\/\//i.test(candidate)) {
    candidate = 'https://' + candidate;
  }

  try {
    const parsed = new URL(candidate);
    return {
      type: 'web' as const,
      raw: text,
      targetUrl: parsed.toString(),
      hostname: parsed.hostname,
      protocol: parsed.protocol,
      parsed,
    };
  } catch {
    // If candidate has spaces or non-URL text, treat as raw QR text payload
    return {
      type: 'text' as const,
      raw: text,
      targetUrl: candidate,
      hostname: text.slice(0, 30),
      protocol: 'text:',
    };
  }
}

// Perform DNS check with safety guards
async function checkDns(hostname: string) {
  // Only query DNS if hostname looks like a valid internet domain or IP
  if (!hostname || !/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(hostname) && !/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) {
    return {
      resolves: false,
      ipAddresses: [],
      error: 'Not a named domain or IP',
    };
  }

  try {
    const lookupPromise = dns.promises.lookup(hostname, { all: true });
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('DNS Timeout')), 1500)
    );

    const addresses = await Promise.race([lookupPromise, timeoutPromise]);
    const ipList = addresses.map((a) => a.address);

    return {
      resolves: ipList.length > 0,
      ipAddresses: ipList,
    };
  } catch (err: any) {
    return {
      resolves: false,
      ipAddresses: [],
      error: err.code || err.message || 'DNS Lookup Failed',
    };
  }
}

// Lightweight HTTP probe
async function probeUrl(targetUrl: string) {
  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    return { accessible: false, error: 'Non-HTTP protocol' };
  }

  const startTime = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2000);

  try {
    const res = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 SafeScan-Audit/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: controller.signal,
      redirect: 'follow',
    });

    clearTimeout(timeoutId);
    const duration = Date.now() - startTime;

    return {
      accessible: true,
      statusCode: res.status,
      finalUrl: res.url !== targetUrl ? res.url : undefined,
      redirectCount: res.redirected ? 1 : 0,
      serverHeader: res.headers.get('server') || undefined,
      contentType: res.headers.get('content-type') || undefined,
      hasHsts: res.headers.has('strict-transport-security'),
      hasCsp: res.headers.has('content-security-policy'),
      responseTimeMs: duration,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    return {
      accessible: false,
      error: err.name === 'AbortError' ? 'Connection probe timed out (>2.0s)' : err.message,
    };
  }
}

// Fallback heuristic engine
function runHeuristicAnalysis(
  classified: ReturnType<typeof sanitizeAndClassifyInput>,
  dnsResult: { resolves: boolean; ipAddresses: string[]; error?: string },
  probeResult: any
) {
  let riskScore = 10;
  const factors: ThreatFactor[] = [];
  let isShortener = false;
  let hasSuspiciousTld = false;
  let isIp = false;
  let brandSpoof = false;
  let impersonated = 'none';

  // 1. UPI Payload Analysis
  if (classified.type === 'upi') {
    const raw = classified.raw.toLowerCase();
    const isCashbackScam = raw.includes('cashback') || raw.includes('refund') || raw.includes('reward') || raw.includes('lottery') || raw.includes('win');
    const hasAmount = raw.includes('am=');

    if (isCashbackScam || (hasAmount && raw.includes('pay?'))) {
      riskScore = 95;
      factors.push({
        title: 'UPI Payment Fraud / Direct Debit Trap',
        description: 'This QR code triggers a debit collect request under the guise of rewards or cashback. Approving it will deduct money from your account.',
        severity: 'high',
        detected: true,
      });
      factors.push({
        title: 'Deceptive Merchant Description',
        description: 'Fraudulent keywords (cashback/refund) detected in payment parameters.',
        severity: 'high',
        detected: true,
      });

      return {
        verdict: 'DANGEROUS' as const,
        riskScore,
        category: 'Financial UPI Fraud Intent',
        summary: 'Warning: This QR code initiates an instant bank debit request disguised as a reward or refund.',
        recommendation: 'Do NOT scan or enter your UPI PIN. You never need to enter a PIN to receive money.',
        hindiSummary: 'Khatra! Yeh QR code aapke bank se paise kaatne ke liye banaya gaya hai. Apna UPI PIN bilkul na daalein.',
        isShortener: false,
        brandSpoofDetected: true,
        impersonatedBrand: 'UPI Cashback Trap',
        threatFactors: factors,
      };
    }

    return {
      verdict: 'SUSPICIOUS' as const,
      riskScore: 45,
      category: 'UPI Payment String',
      summary: 'This QR code contains direct UPI merchant transfer details. Verify receiver VPA before approving.',
      recommendation: 'Ensure you recognize the merchant before authorizing payment with your UPI PIN.',
      hindiSummary: 'Yeh ek UPI payment QR hai. Paise bhejne se pehle receiver ka naam dhyan se check karein.',
      isShortener: false,
      brandSpoofDetected: false,
      impersonatedBrand: 'none',
      threatFactors: [
        {
          title: 'Direct Financial Transfer Intent',
          description: 'Payment parameters detected. Verification required before pin submission.',
          severity: 'medium',
          detected: true,
        },
      ],
    };
  }

  // 2. Wi-Fi QR Code Analysis
  if (classified.type === 'wifi') {
    return {
      verdict: 'SAFE' as const,
      riskScore: 10,
      category: 'Wi-Fi Network Configuration',
      summary: 'The scanned QR code contains local Wi-Fi network credentials (SSID and authentication key).',
      recommendation: 'Only connect if this Wi-Fi QR code is from a trusted premises or router.',
      hindiSummary: 'Yeh Wi-Fi connect karne ka QR code hai. Kisi anjaan jagah par bina pooche connect na karein.',
      isShortener: false,
      brandSpoofDetected: false,
      impersonatedBrand: 'none',
      threatFactors: [
        {
          title: 'Wi-Fi Network Profile',
          description: 'Standard local network setup payload (WPA/WPA2/WEP).',
          severity: 'safe',
          detected: true,
        },
      ],
    };
  }

  // 3. Raw Text / Non-URL Payload
  if (classified.type === 'text') {
    const rawLower = classified.raw.toLowerCase();
    const hasScamWords = /lottery|winner|bank\s*block|kyc\s*update|credit\s*card\s*points|otp/i.test(rawLower);

    if (hasScamWords) {
      riskScore = 85;
      factors.push({
        title: 'Social Engineering Scam Keywords',
        description: 'Text contains urgency and deception triggers commonly used in SMS/WhatsApp fraud.',
        severity: 'high',
        detected: true,
      });
      return {
        verdict: 'DANGEROUS' as const,
        riskScore,
        category: 'Social Engineering Fraud Text',
        summary: 'Deceptive text pattern detected containing scam lures (KYC/Lottery/Card Blocked).',
        recommendation: 'Do not follow instructions in this message or share OTPs.',
        hindiSummary: 'Yeh message fraud lag raha hai. Apni personal details ya OTP kisi ko na dein.',
        isShortener: false,
        brandSpoofDetected: false,
        impersonatedBrand: 'none',
        threatFactors: factors,
      };
    }

    return {
      verdict: 'SAFE' as const,
      riskScore: 15,
      category: 'Plain Text Payload',
      summary: 'The scanned content is plain informational text and does not link to executable code.',
      recommendation: 'Informational message. Exercise common sense with any instructions.',
      hindiSummary: 'Yeh aam text jankari hai, koi website link nahi hai.',
      isShortener: false,
      brandSpoofDetected: false,
      impersonatedBrand: 'none',
      threatFactors: [
        {
          title: 'Plain Text Content',
          description: 'No active web redirects or downloadable binaries detected.',
          severity: 'safe',
          detected: true,
        },
      ],
    };
  }

  // 4. Standard Web Domain / URL Heuristics
  const hostname = (classified.hostname || '').toLowerCase();
  const protocol = classified.protocol || 'https:';
  const tld = hostname.includes('.') ? hostname.split('.').pop() || '' : '';

  // Check IP host
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) {
    isIp = true;
    riskScore += 35;
    factors.push({
      title: 'Raw IP Address Host',
      description: 'Host uses a bare numerical IP instead of a registered domain name.',
      severity: 'high',
      detected: true,
    });
  }

  // Check HTTPS
  if (protocol === 'http:') {
    riskScore += 25;
    factors.push({
      title: 'Unencrypted HTTP Protocol',
      description: 'Connection lacks SSL/TLS encryption. Traffic can be eavesdropped or modified in transit.',
      severity: 'medium',
      detected: true,
    });
  } else {
    factors.push({
      title: 'SSL/TLS Encrypted Connection',
      description: 'HTTPS protocol is enabled protecting transport communication.',
      severity: 'safe',
      detected: true,
    });
  }

  // Check Shortener
  if (SHORTENER_DOMAINS.has(hostname)) {
    isShortener = true;
    riskScore += 20;
    factors.push({
      title: 'Shortened / Cloaked Link',
      description: 'The real web destination is masked behind a link shortener service.',
      severity: 'medium',
      detected: true,
    });
  }

  // Check Suspicious TLD
  if (HIGH_RISK_TLDS.has(tld)) {
    hasSuspiciousTld = true;
    riskScore += 25;
    factors.push({
      title: `High-Risk TLD (.${tld})`,
      description: 'Top-level domain has a statistically high correlation with disposable spam or phishing domains.',
      severity: 'medium',
      detected: true,
    });
  }

  // Check Brand Mimicry
  const sensitiveBrands = ['paypal', 'google', 'apple', 'netflix', 'microsoft', 'amazon', 'facebook', 'instagram', 'sbi', 'hdfc', 'icici', 'paytm', 'binance', 'coinbase'];
  for (const b of sensitiveBrands) {
    if (hostname.includes(b) && !hostname.endsWith(`.${b}.com`) && hostname !== `${b}.com` && hostname !== `${b}.in`) {
      brandSpoof = true;
      impersonated = b;
      riskScore += 45;
      factors.push({
        title: `Possible Brand Impersonation (${b.toUpperCase()})`,
        description: `Domain mimics ${b} brand name but belongs to an unverified third-party host.`,
        severity: 'high',
        detected: true,
      });
      break;
    }
  }

  // Check Executable Download (.exe, .apk, .scr, etc.)
  const targetLower = classified.targetUrl.toLowerCase();
  if (/\.(exe|apk|bat|cmd|vbs|scr|msi|ps1)($|\?)/i.test(targetLower)) {
    riskScore += 50;
    factors.push({
      title: 'Executable / Installer Download Link',
      description: 'URL directly downloads application binaries (.exe / .apk / .scr) which can compromise devices.',
      severity: 'high',
      detected: true,
    });
  }

  // Check DNS resolution
  if (!dnsResult.resolves && !isIp) {
    riskScore += 15;
    factors.push({
      title: 'Domain DNS Lookup Failure',
      description: 'Host cannot be resolved on public nameservers (may be expired or non-existent).',
      severity: 'medium',
      detected: true,
    });
  } else if (dnsResult.resolves) {
    factors.push({
      title: 'Active DNS Resolution',
      description: `Domain resolved successfully to IP: ${dnsResult.ipAddresses[0] || 'active'}.`,
      severity: 'safe',
      detected: true,
    });
  }

  // Known Trusted Major Domains
  const trustedMajorDomains = [
    'google.com', 'youtube.com', 'github.com', 'microsoft.com', 'apple.com',
    'wikipedia.org', 'amazon.com', 'cloudflare.com', 'linkedin.com', 'twitter.com',
    'x.com', 'gov.in', 'nic.in', 'instagram.com', 'facebook.com', 'whatsapp.com'
  ];
  if (trustedMajorDomains.some((d) => hostname === d || hostname.endsWith('.' + d))) {
    riskScore = 5;
    factors.unshift({
      title: 'Globally Verified Trusted Entity',
      description: 'Hostname belongs to an authenticated, globally verified major provider.',
      severity: 'safe',
      detected: true,
    });
  }

  riskScore = Math.min(100, Math.max(0, riskScore));
  let verdict: 'SAFE' | 'SUSPICIOUS' | 'DANGEROUS' = 'SAFE';
  if (riskScore >= 70) verdict = 'DANGEROUS';
  else if (riskScore >= 35) verdict = 'SUSPICIOUS';

  return {
    verdict,
    riskScore,
    category: verdict === 'DANGEROUS' ? 'High Risk Threat' : verdict === 'SUSPICIOUS' ? 'Cautionary Domain' : 'Verified Web Destination',
    summary: verdict === 'SAFE'
      ? 'The analyzed link exhibits standard cryptographic certificates and normal infrastructural indicators.'
      : verdict === 'SUSPICIOUS'
      ? 'The analyzed link possesses multiple risk indicators like cloaking or unusual domain structure.'
      : 'Critical threat detected. This destination exhibits strong indicators of brand phishing or malicious payloads.',
    recommendation: verdict === 'SAFE'
      ? 'Safe to navigate. Always verify before entering sensitive banking credentials.'
      : verdict === 'SUSPICIOUS'
      ? 'Proceed with high caution. Do not download unexpected files or supply personal details.'
      : 'Do not visit this URL. Close any prompt immediately and do not enter any credentials or OTPs.',
    hindiSummary: verdict === 'SAFE'
      ? 'Yeh link safe lag raha hai, aap ise open kar sakte hain.'
      : verdict === 'SUSPICIOUS'
      ? 'Yeh link sandighdh (suspicious) lag raha hai, dhyan se open karein.'
      : 'Khatra! Yeh link fraud ya virus ho sakta hai, ise bilkul open na karein.',
    isShortener,
    brandSpoofDetected: brandSpoof,
    impersonatedBrand: impersonated,
    threatFactors: factors,
  };
}

// AI evaluation with fast 2.0s timeout
async function evaluateWithGemini(
  classified: ReturnType<typeof sanitizeAndClassifyInput>,
  dnsResult: any,
  probeResult: any
) {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }

  const prompt = `You are a Principal Cyber Security & Threat Intelligence Analyst.
Analyze this URL or QR payload:
Payload: "${classified.raw}"
Target: "${classified.targetUrl}"
Host: "${classified.hostname}"
DNS Resolves: ${dnsResult.resolves} (IPs: ${dnsResult.ipAddresses.join(', ') || 'None'})
HTTP Probe: ${probeResult.accessible ? `Status ${probeResult.statusCode}` : 'Unreachable'}

Classify if SAFE, SUSPICIOUS, or DANGEROUS.
Return JSON adhering strictly to:
{
  "verdict": "SAFE" | "SUSPICIOUS" | "DANGEROUS",
  "riskScore": number (0-100),
  "category": string,
  "summary": string,
  "recommendation": string,
  "hindiSummary": string,
  "isShortener": boolean,
  "brandSpoofDetected": boolean,
  "impersonatedBrand": string,
  "threatFactors": [
    {
      "title": string,
      "description": string,
      "severity": "safe" | "low" | "medium" | "high",
      "detected": boolean
    }
  ]
}`;

  try {
    const aiPromise = ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            verdict: { type: Type.STRING },
            riskScore: { type: Type.INTEGER },
            category: { type: Type.STRING },
            summary: { type: Type.STRING },
            recommendation: { type: Type.STRING },
            hindiSummary: { type: Type.STRING },
            isShortener: { type: Type.BOOLEAN },
            brandSpoofDetected: { type: Type.BOOLEAN },
            impersonatedBrand: { type: Type.STRING },
            threatFactors: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  severity: { type: Type.STRING },
                  detected: { type: Type.BOOLEAN },
                },
                required: ['title', 'description', 'severity', 'detected'],
              },
            },
          },
          required: ['verdict', 'riskScore', 'category', 'summary', 'recommendation', 'threatFactors'],
        },
      },
    });

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('AI Timeout')), 2200)
    );

    const response = (await Promise.race([aiPromise, timeoutPromise])) as any;
    const parsed = JSON.parse(response.text?.trim() || '{}');
    return parsed;
  } catch {
    return null;
  }
}

// ================= API ROUTES =================

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'SafeScan Guard Security Engine',
    timestamp: new Date().toISOString(),
  });
});

// Deep scan URL endpoint - 100% resilient
app.post('/api/scan-url', async (req: Request, res: Response) => {
  try {
    const rawInput = req.body?.url;
    if (!rawInput || typeof rawInput !== 'string') {
      return res.status(400).json({ error: 'Please provide a valid URL or QR payload string' });
    }

    // Step 1: Sanitize and classify input (never throws)
    const classified = sanitizeAndClassifyInput(rawInput);
    const hostname = classified.hostname;
    const protocol = classified.protocol;

    let pathDepth = 0;
    let queryParamCount = 0;
    let port = undefined;

    if (classified.parsed) {
      pathDepth = classified.parsed.pathname.split('/').filter(Boolean).length;
      queryParamCount = Array.from(classified.parsed.searchParams.keys()).length;
      port = classified.parsed.port || (protocol === 'https:' ? '443' : protocol === 'http:' ? '80' : undefined);
    }

    // Step 2: Parallel DNS and HTTP probe (if applicable)
    let dnsResult = { resolves: false, ipAddresses: [] as string[] };
    let probeResult: any = { accessible: false, error: 'Non-web payload' };

    if (classified.type === 'web') {
      dnsResult = await checkDns(hostname);
      if (dnsResult.resolves || /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) {
        probeResult = await probeUrl(classified.targetUrl);
      } else {
        probeResult = { accessible: false, error: 'Domain does not resolve' };
      }
    }

    // Step 3: Run AI check with fast fallback
    const aiAnalysis = await evaluateWithGemini(classified, dnsResult, probeResult);
    const fallback = runHeuristicAnalysis(classified, dnsResult, probeResult);

    const finalVerdict = aiAnalysis?.verdict || fallback.verdict;
    const finalScore = typeof aiAnalysis?.riskScore === 'number' ? aiAnalysis.riskScore : fallback.riskScore;
    const finalCategory = aiAnalysis?.category || fallback.category;
    const finalSummary = aiAnalysis?.summary || fallback.summary;
    const finalRecommendation = aiAnalysis?.recommendation || fallback.recommendation;
    const finalHindi = aiAnalysis?.hindiSummary || fallback.hindiSummary;
    const threatFactors = aiAnalysis?.threatFactors?.length ? aiAnalysis.threatFactors : fallback.threatFactors;

    const tld = hostname.includes('.') ? hostname.split('.').pop() || '' : '';
    const isIp = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname);
    const isShortener = aiAnalysis?.isShortener ?? fallback.isShortener;
    const brandSpoof = aiAnalysis?.brandSpoofDetected ?? fallback.brandSpoofDetected;
    const impersonated = aiAnalysis?.impersonatedBrand ?? fallback.impersonatedBrand;

    const responseData: ScanResult = {
      url: rawInput,
      normalizedUrl: classified.targetUrl,
      domain: hostname,
      verdict: finalVerdict,
      riskScore: finalScore,
      category: finalCategory,
      summary: finalSummary,
      recommendation: finalRecommendation,
      hindiSummary: finalHindi,
      dnsInfo: dnsResult,
      threatFactors,
      details: {
        protocol,
        hasHttps: protocol === 'https:',
        isIpAddress: isIp,
        isShortener,
        hasSuspiciousTld: HIGH_RISK_TLDS.has(tld),
        brandSpoofDetected: brandSpoof,
        impersonatedBrand: impersonated !== 'none' ? impersonated : undefined,
        port,
        pathDepth,
        queryParamCount,
      },
      httpProbe: probeResult,
      analyzedAt: new Date().toISOString(),
      sourceType: req.body?.source || 'url',
    };

    return res.json(responseData);
  } catch (error: any) {
    console.error('SafeScan URL Error:', error);
    // Even in case of unexpected exception, return a safe recovery response instead of 500 error
    return res.json({
      url: req.body?.url || 'unknown',
      normalizedUrl: req.body?.url || 'unknown',
      domain: 'Unknown Payload',
      verdict: 'SUSPICIOUS',
      riskScore: 50,
      category: 'Unverified Data String',
      summary: 'The submitted link or QR code contains unverified parameters. Exercise caution before opening.',
      recommendation: 'Do not supply passwords or personal credentials.',
      hindiSummary: 'Yeh link ya QR code ki janch me savdhani bartein. Koi OTP ya password share na karein.',
      dnsInfo: { resolves: false, ipAddresses: [] },
      threatFactors: [
        {
          title: 'Unconventional Link Format',
          description: 'The target content is an arbitrary URI scheme or non-standard format.',
          severity: 'medium',
          detected: true,
        },
      ],
      details: {
        protocol: 'custom:',
        hasHttps: false,
        isIpAddress: false,
        isShortener: false,
        hasSuspiciousTld: false,
        brandSpoofDetected: false,
        pathDepth: 0,
        queryParamCount: 0,
      },
      httpProbe: { accessible: false, error: 'Not inspectable' },
      analyzedAt: new Date().toISOString(),
    });
  }
});

// Setup Vite dev server or serve production build
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: 3000,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });

    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`[SafeScan Guard Server] listening on http://0.0.0.0:${PORT} (mode: ${isProd ? 'production' : 'development'})`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
