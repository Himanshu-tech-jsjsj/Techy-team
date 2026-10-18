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

// Server-side Gemini initialization
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

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
    mxRecords?: string[];
    error?: string;
  };
  threatFactors: {
    title: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'safe';
    detected: boolean;
  }[];
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

// Helper to normalize and validate URL structure
function normalizeInputUrl(input: string): { url: string; error?: string } {
  let cleaned = input.trim();
  if (!cleaned) {
    return { url: '', error: 'URL or payload is empty' };
  }

  // Handle UPI intents or custom URI schemes
  if (cleaned.startsWith('upi://') || cleaned.startsWith('mailto:') || cleaned.startsWith('tel:') || cleaned.startsWith('sms:')) {
    return { url: cleaned };
  }

  // Prepend https:// if no protocol provided
  if (!/^https?:\/\//i.test(cleaned)) {
    cleaned = 'https://' + cleaned;
  }

  try {
    const parsed = new URL(cleaned);
    if (!parsed.hostname) {
      return { url: '', error: 'Invalid hostname' };
    }
    return { url: parsed.toString() };
  } catch (err: any) {
    return { url: '', error: `Invalid URL format: ${err.message}` };
  }
}

// Perform DNS checks with fast timeout
async function checkDns(hostname: string) {
  try {
    const lookupPromise = dns.promises.lookup(hostname, { all: true });
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('DNS Timeout')), 2000));
    
    const addresses = (await Promise.race([lookupPromise, timeoutPromise])) as dns.LookupAddress[];
    const ipList = addresses.map((a) => a.address);

    return {
      resolves: true,
      ipAddresses: ipList,
    };
  } catch (err: any) {
    return {
      resolves: false,
      ipAddresses: [],
      error: err.code || err.message,
    };
  }
}

// Lightweight HTTP probe to inspect headers and redirect flow
async function probeUrl(targetUrl: string) {
  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    return { accessible: false, error: 'Non-HTTP protocol' };
  }

  const startTime = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2500);

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
      error: err.name === 'AbortError' ? 'Connection probe timed out (>2.5s)' : err.message,
    };
  }
}

// AI-powered deep cyber safety evaluation
async function evaluateWithGemini(url: string, domain: string, dnsResult: any, probeResult: any) {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }

  const prompt = `You are a Principal Cyber Security & Threat Intelligence Analyst.
Analyze the following URL or QR payload:
URL: "${url}"
Domain: "${domain}"
DNS Resolves: ${dnsResult.resolves} (IPs: ${dnsResult.ipAddresses.join(', ') || 'None'})
HTTP Probe: ${probeResult.accessible ? `Status ${probeResult.statusCode}, Final: ${probeResult.finalUrl || 'Same'}` : `Failed: ${probeResult.error || 'unreachable'}`}

Inspect for:
1. Phishing / credential theft (e.g. fake login, bank/government/crypto impersonation, typosquatting like paypa1, stat-bank, netflx).
2. Malicious downloads, trojans, ransomware, apk sideload traps (.exe, .scr, .apk, .vbs, .zip).
3. UPI / QR code payment fraud (fake merchant VPA, collect requests masking as cashbacks).
4. Deceptive redirects, cloaked URL shorteners, punycode/homograph attacks.
5. Deceptive domain structure (excessive subdomains, IP hostnames, high-risk suspicious TLDs like .top, .xyz with sensitive financial keywords).
6. Legitimate verified domains (e.g. google.com, github.com, apple.com, wikipedia.org, microsoft.com, legitimate e-commerce, official government sites).

Provide your strict security assessment in JSON format adhering to this schema:
{
  "verdict": "SAFE" | "SUSPICIOUS" | "DANGEROUS",
  "riskScore": number (0 to 100, where 0 is completely safe, 40-69 is suspicious, 70-100 is high danger),
  "category": string (e.g. "Clean Verified Platform", "Phishing / Credential Harvester", "UPI Payment Fraud Trap", "Malware Delivery Domain", "Deceptive Brand Impersonation", "Cloaked Shortened Link"),
  "summary": string (2-3 concise, professional sentences explaining the safety diagnosis),
  "recommendation": string (Clear instruction on what the user should or should not do),
  "hindiSummary": string (Crisp 1-2 sentence explanation in Hindi/Hinglish so everyday users understand clearly whether to open it or avoid it),
  "isShortener": boolean,
  "brandSpoofDetected": boolean,
  "impersonatedBrand": string (or "none"),
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

    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('AI Analysis Timeout')), 4500));
    const response = (await Promise.race([aiPromise, timeoutPromise])) as any;

    const parsed = JSON.parse(response.text?.trim() || '{}');
    return parsed;
  } catch (err: any) {
    console.warn('Gemini threat analysis bypassed or timed out, applying heuristic engine:', err.message);
    return null;
  }
}

// Fallback heuristic engine if external AI is delayed or unavailable
function fallbackHeuristicAnalysis(url: string, parsedUrl: URL | null, dnsResult: any, probeResult: any) {
  let riskScore = 15;
  const factors: any[] = [];
  let isShortener = false;
  let hasSuspiciousTld = false;
  let isIp = false;
  let brandSpoof = false;
  let impersonated = 'none';

  if (!parsedUrl) {
    return {
      verdict: 'SUSPICIOUS' as const,
      riskScore: 60,
      category: 'Unconventional Payload',
      summary: 'The scanned content does not follow standard web URL syntax. Exercise caution before trusting.',
      recommendation: 'Do not authorize or enter credentials on unverified URI schemes.',
      hindiSummary: 'Yeh standard website link nahi lag raha hai. Ise bina janch ke open na karein.',
      isShortener: false,
      brandSpoofDetected: false,
      impersonatedBrand: 'none',
      threatFactors: [
        {
          title: 'Non-Standard Web Format',
          description: 'The target content is an arbitrary URI scheme or raw payload.',
          severity: 'medium',
          detected: true,
        },
      ],
    };
  }

  const hostname = parsedUrl.hostname.toLowerCase();
  const protocol = parsedUrl.protocol;
  const tld = hostname.split('.').pop() || '';

  // Check IP address hostname
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) {
    isIp = true;
    riskScore += 35;
    factors.push({
      title: 'Raw IP Address Host',
      description: 'Legitimate services use branded domain names rather than bare IP addresses.',
      severity: 'high',
      detected: true,
    });
  }

  // Check Protocol
  if (protocol === 'http:') {
    riskScore += 25;
    factors.push({
      title: 'Unencrypted HTTP Protocol',
      description: 'The connection lacks SSL/TLS encryption. Data can be intercepted or manipulated.',
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
      description: 'The original destination is masked behind a link-shortening service.',
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
      description: 'This top-level domain has a statistically high correlation with disposable spam or phishing.',
      severity: 'medium',
      detected: true,
    });
  }

  // Check Brand Mimicry in Subdomains or Path
  const sensitiveBrands = ['paypal', 'google', 'apple', 'netflix', 'microsoft', 'amazon', 'facebook', 'instagram', 'sbi', 'hdfc', 'icici', 'paytm', 'binance', 'coinbase'];
  for (const b of sensitiveBrands) {
    if (hostname.includes(b) && !hostname.endsWith(`.${b}.com`) && hostname !== `${b}.com` && hostname !== `${b}.in`) {
      brandSpoof = true;
      impersonated = b;
      riskScore += 45;
      factors.push({
        title: `Possible Brand Impersonation (${b.toUpperCase()})`,
        description: `The domain name appears to imitate ${b} but is hosted on an unverified third-party domain.`,
        severity: 'high',
        detected: true,
      });
      break;
    }
  }

  // Check DNS Resolution
  if (!dnsResult.resolves) {
    riskScore += 20;
    factors.push({
      title: 'Domain DNS Lookup Failure',
      description: 'The host has no active A/AAAA records or cannot be found on public root nameservers.',
      severity: 'medium',
      detected: true,
    });
  } else {
    factors.push({
      title: 'Active DNS Resolution',
      description: `Domain successfully resolved to active IP: ${dnsResult.ipAddresses[0] || 'active'}.`,
      severity: 'safe',
      detected: true,
    });
  }

  // High risk file extensions
  if (/\.(exe|apk|bat|cmd|vbs|scr|msi|ps1)($|\?)/i.test(parsedUrl.pathname)) {
    riskScore += 50;
    factors.push({
      title: 'Executable / Installer Download Link',
      description: 'The URL directly downloads executable or application package binaries (.exe / .apk / .scr).',
      severity: 'high',
      detected: true,
    });
  }

  // Known trusted domains
  const trustedMajorDomains = ['google.com', 'youtube.com', 'github.com', 'microsoft.com', 'apple.com', 'wikipedia.org', 'amazon.com', 'cloudflare.com', 'linkedin.com', 'twitter.com', 'x.com', 'gov.in', 'nic.in'];
  if (trustedMajorDomains.some(d => hostname === d || hostname.endsWith('.' + d))) {
    riskScore = 5;
    factors.unshift({
      title: 'Globally Verified Trusted Entity',
      description: 'The hostname belongs to a well-known, globally authenticated authority.',
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

// ================= API ROUTES =================

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'SafeScan Guard Security Engine',
    timestamp: new Date().toISOString(),
  });
});

// Deep scan URL endpoint
app.post('/api/scan-url', async (req: Request, res: Response) => {
  try {
    const { url, source = 'url_input' } = req.body;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'Please provide a valid URL or QR payload string' });
    }

    const { url: normalized, error: normErr } = normalizeInputUrl(url);
    if (normErr && !url.startsWith('upi://')) {
      return res.status(400).json({ error: normErr });
    }

    const targetUrl = normalized || url;

    // Parse URL components
    let parsed: URL | null = null;
    let hostname = '';
    let protocol = '';
    let pathDepth = 0;
    let queryParamCount = 0;

    try {
      parsed = new URL(targetUrl);
      hostname = parsed.hostname;
      protocol = parsed.protocol;
      pathDepth = parsed.pathname.split('/').filter(Boolean).length;
      queryParamCount = Array.from(parsed.searchParams.keys()).length;
    } catch {
      // Non-standard URI (e.g. upi://)
      hostname = targetUrl.split('?')[0];
      protocol = targetUrl.split(':')[0] + ':';
    }

    // Step 1: Network DNS Lookup
    const dnsResult = hostname ? await checkDns(hostname) : { resolves: false, ipAddresses: [] };

    // Step 2: HTTP Probe (Non-blocking / only if DNS resolves or IP)
    let probeResult: any = { accessible: false, error: 'Domain does not resolve' };
    if (parsed && (protocol === 'http:' || protocol === 'https:') && (dnsResult.resolves || /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname))) {
      probeResult = await probeUrl(targetUrl);
    }

    // Step 3: AI Threat Analysis via Gemini
    const aiAnalysis = await evaluateWithGemini(targetUrl, hostname, dnsResult, probeResult);

    // Merge AI analysis with fallback heuristics
    const fallback = fallbackHeuristicAnalysis(targetUrl, parsed, dnsResult, probeResult);
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
      url,
      normalizedUrl: targetUrl,
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
        port: parsed?.port || (protocol === 'https:' ? '443' : protocol === 'http:' ? '80' : undefined),
        pathDepth,
        queryParamCount,
      },
      httpProbe: probeResult,
      analyzedAt: new Date().toISOString(),
    };

    return res.json(responseData);
  } catch (error: any) {
    console.error('Scan URL Error:', error);
    return res.status(500).json({
      error: 'An unexpected security engine error occurred while scanning the URL.',
      details: error.message,
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
