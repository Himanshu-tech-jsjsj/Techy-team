export interface ThreatFactor {
  title: string;
  description: string;
  severity: 'safe' | 'low' | 'medium' | 'high';
  detected: boolean;
}

export interface ScanResult {
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
  sourceType?: 'url' | 'qr_upload' | 'camera';
}

export interface ScanHistoryItem {
  id: string;
  url: string;
  domain: string;
  verdict: 'SAFE' | 'SUSPICIOUS' | 'DANGEROUS';
  riskScore: number;
  category: string;
  timestamp: string;
  sourceType: 'url' | 'qr_upload' | 'camera';
}
