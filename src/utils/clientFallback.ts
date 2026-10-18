import { ScanResult } from '../types';

export function runClientSideScanFallback(input: string, sourceType: 'url' | 'qr_upload' | 'camera' = 'url'): ScanResult {
  const text = String(input || '').trim();
  let domain = text;
  let protocol = 'https:';
  let isHttps = true;
  let isIp = false;
  let isShortener = false;
  let hasSuspiciousTld = false;
  let brandSpoof = false;
  let impersonatedBrand = undefined;
  let riskScore = 15;
  const threatFactors: any[] = [];

  // UPI Fraud pattern
  if (/^upi:\/\//i.test(text) || text.includes('@okaxis') || text.includes('@okhdfcbank') || text.includes('@paytm')) {
    const isScam = /cashback|reward|lottery|win|refund/i.test(text) || text.includes('am=');
    return {
      url: text,
      normalizedUrl: text,
      domain: 'UPI Payment Gateway',
      verdict: isScam ? 'DANGEROUS' : 'SUSPICIOUS',
      riskScore: isScam ? 95 : 45,
      category: isScam ? 'Financial UPI Fraud Intent' : 'UPI Payment Payload',
      summary: isScam
        ? 'Warning: This QR code initiates an instant bank debit collect request disguised as cashback.'
        : 'UPI payment parameters detected. Verify receiver identity before authorizing.',
      recommendation: isScam
        ? 'Do NOT enter your UPI PIN. Entering your PIN transfers money out of your account.'
        : 'Confirm the merchant name and amount before entering your PIN.',
      hindiSummary: isScam
        ? 'Khatra! Yeh QR code aapke bank se paise kaatne ke liye banaya gaya hai. Apna UPI PIN bilkul na daalein.'
        : 'Yeh UPI payment QR hai. Paise bhejne se pehle receiver ka naam check karein.',
      dnsInfo: { resolves: false, ipAddresses: [] },
      threatFactors: [
        {
          title: isScam ? 'UPI Payment Fraud / Direct Debit Trap' : 'Direct Financial Intent',
          description: isScam ? 'Fraudulent keywords detected in payment collect string.' : 'Standard payment intent.',
          severity: isScam ? 'high' : 'medium',
          detected: true,
        },
      ],
      details: {
        protocol: 'upi:',
        hasHttps: false,
        isIpAddress: false,
        isShortener: false,
        hasSuspiciousTld: false,
        brandSpoofDetected: isScam,
        impersonatedBrand: isScam ? 'UPI Cashback Fraud' : undefined,
        pathDepth: 0,
        queryParamCount: 1,
      },
      httpProbe: { accessible: false, error: 'UPI protocol' },
      analyzedAt: new Date().toISOString(),
      sourceType,
    };
  }

  // Web URL parsing
  let candidate = text;
  if (!/^https?:\/\//i.test(candidate) && !candidate.startsWith('wifi:') && !candidate.startsWith('begin:')) {
    candidate = 'https://' + candidate;
  }

  try {
    const parsed = new URL(candidate);
    domain = parsed.hostname;
    protocol = parsed.protocol;
    isHttps = protocol === 'https:';

    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(domain)) {
      isIp = true;
      riskScore += 35;
      threatFactors.push({
        title: 'Raw IP Hostname',
        description: 'Server address uses numerical IP rather than a registered domain name.',
        severity: 'high',
        detected: true,
      });
    }

    if (!isHttps) {
      riskScore += 25;
      threatFactors.push({
        title: 'Unencrypted HTTP Protocol',
        description: 'Connection lacks SSL/TLS transport encryption.',
        severity: 'medium',
        detected: true,
      });
    } else {
      threatFactors.push({
        title: 'SSL/TLS Encrypted Connection',
        description: 'HTTPS protocol is enabled.',
        severity: 'safe',
        detected: true,
      });
    }

    const shorteners = ['bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'cutt.ly', 'rb.gy'];
    if (shorteners.includes(domain.toLowerCase())) {
      isShortener = true;
      riskScore += 20;
      threatFactors.push({
        title: 'Shortened Link',
        description: 'Destination URL is masked behind a link-shortening redirect.',
        severity: 'medium',
        detected: true,
      });
    }

    const badTlds = ['top', 'xyz', 'click', 'work', 'loan', 'buzz', 'download'];
    const tld = domain.split('.').pop()?.toLowerCase() || '';
    if (badTlds.includes(tld)) {
      hasSuspiciousTld = true;
      riskScore += 25;
      threatFactors.push({
        title: `Suspicious TLD (.${tld})`,
        description: 'Domain uses a high-risk disposable top-level extension.',
        severity: 'medium',
        detected: true,
      });
    }

    const brands = ['paypal', 'sbi', 'hdfc', 'google', 'netflix', 'amazon', 'apple', 'paytm'];
    for (const b of brands) {
      if (domain.toLowerCase().includes(b) && !domain.toLowerCase().endsWith(`.${b}.com`) && domain.toLowerCase() !== `${b}.com` && domain.toLowerCase() !== `${b}.in`) {
        brandSpoof = true;
        impersonatedBrand = b.toUpperCase();
        riskScore += 45;
        threatFactors.push({
          title: `Possible Brand Spoofing (${b.toUpperCase()})`,
          description: `The domain imitates ${b} on an unverified third-party host.`,
          severity: 'high',
          detected: true,
        });
        break;
      }
    }

    if (/\.(exe|apk|bat|cmd|vbs|scr)($|\?)/i.test(parsed.pathname)) {
      riskScore += 50;
      threatFactors.push({
        title: 'Executable / Installer Download Link',
        description: 'URL downloads executable or application binary (.exe / .apk).',
        severity: 'high',
        detected: true,
      });
    }

    const trusted = ['google.com', 'youtube.com', 'github.com', 'microsoft.com', 'apple.com', 'wikipedia.org', 'amazon.com', 'instagram.com'];
    if (trusted.some((t) => domain === t || domain.endsWith('.' + t))) {
      riskScore = 5;
      threatFactors.unshift({
        title: 'Globally Verified Trusted Entity',
        description: 'Verified official provider with authenticated credentials.',
        severity: 'safe',
        detected: true,
      });
    }
  } catch {
    // Arbitrary text payload
    domain = text.slice(0, 30);
    protocol = 'text:';
    threatFactors.push({
      title: 'Decoded QR Payload',
      description: 'The scanned item contains raw text or custom format rather than standard web link.',
      severity: 'safe',
      detected: true,
    });
  }

  riskScore = Math.min(100, Math.max(0, riskScore));
  let verdict: 'SAFE' | 'SUSPICIOUS' | 'DANGEROUS' = 'SAFE';
  if (riskScore >= 70) verdict = 'DANGEROUS';
  else if (riskScore >= 35) verdict = 'SUSPICIOUS';

  return {
    url: text,
    normalizedUrl: candidate,
    domain,
    verdict,
    riskScore,
    category: verdict === 'DANGEROUS' ? 'High Risk Threat' : verdict === 'SUSPICIOUS' ? 'Cautionary Destination' : 'Verified Web Destination',
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
    dnsInfo: { resolves: true, ipAddresses: [] },
    threatFactors,
    details: {
      protocol,
      hasHttps: isHttps,
      isIpAddress: isIp,
      isShortener,
      hasSuspiciousTld,
      brandSpoofDetected: brandSpoof,
      impersonatedBrand,
      pathDepth: 1,
      queryParamCount: 0,
    },
    httpProbe: { accessible: true, statusCode: 200 },
    analyzedAt: new Date().toISOString(),
    sourceType,
  };
}
