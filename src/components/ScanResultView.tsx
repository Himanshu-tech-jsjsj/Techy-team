import React, { useState } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  AlertTriangle, 
  ExternalLink, 
  Copy, 
  Check, 
  Download, 
  Share2, 
  Lock, 
  Unlock, 
  Globe, 
  Server, 
  FileText, 
  Info, 
  Terminal,
  QrCode,
  ArrowRight,
  Sparkles,
  Layers
} from 'lucide-react';
import { ScanResult } from '../types';
import QRCode from 'qrcode';

interface ScanResultViewProps {
  result: ScanResult;
  onReset: () => void;
  onRescan: (url: string) => void;
}

export const ScanResultView: React.FC<ScanResultViewProps> = ({
  result,
  onReset,
  onRescan,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'threats' | 'anatomy' | 'sandbox'>('overview');
  const [copied, setCopied] = useState(false);
  const [downloadingCert, setDownloadingCert] = useState(false);

  const isSafe = result.verdict === 'SAFE';
  const isSuspicious = result.verdict === 'SUSPICIOUS';
  const isDangerous = result.verdict === 'DANGEROUS';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(result.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(result, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `safescan-audit-${result.domain || 'report'}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleDownloadQrCertificate = async () => {
    setDownloadingCert(true);
    try {
      const qrDataUrl = await QRCode.toDataURL(result.url, {
        margin: 2,
        width: 400,
        color: {
          dark: isDangerous ? '#dc2626' : isSuspicious ? '#d97706' : '#059669',
          light: '#ffffff',
        },
      });

      const a = document.createElement('a');
      a.href = qrDataUrl;
      a.download = `safescan-qr-${result.domain || 'code'}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error('Failed to export QR', err);
    } finally {
      setDownloadingCert(false);
    }
  };

  return (
    <section className="max-w-5xl mx-auto my-8 px-4 sm:px-6 animate-fade-in">
      {/* Top Breadcrumb & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Analysis Report</span>
          <span className="text-slate-300">•</span>
          <span className="text-xs font-mono text-slate-600 truncate max-w-xs">{result.domain || result.url}</span>
          {result.sourceType && (
            <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-slate-100 text-slate-700">
              {result.sourceType === 'qr_upload' ? 'QR Image' : result.sourceType === 'camera' ? 'Camera QR' : 'Direct Link'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-700 shadow-2xs transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
            <span>{copied ? 'Copied' : 'Copy Target'}</span>
          </button>
          <button
            type="button"
            onClick={handleExportJson}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-700 shadow-2xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export Report</span>
          </button>
          <button
            type="button"
            onClick={onReset}
            className="px-3.5 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs transition-colors"
          >
            Scan New Link
          </button>
        </div>
      </div>

      {/* Hero Verdict Banner */}
      <div
        className={`rounded-3xl p-6 sm:p-8 border-2 transition-all shadow-xl ${
          isDangerous
            ? 'bg-gradient-to-br from-rose-50 via-white to-red-50/50 border-rose-300 shadow-rose-100/50'
            : isSuspicious
            ? 'bg-gradient-to-br from-amber-50 via-white to-yellow-50/50 border-amber-300 shadow-amber-100/50'
            : 'bg-gradient-to-br from-emerald-50 via-white to-teal-50/50 border-emerald-300 shadow-emerald-100/50'
        }`}
      >
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          {/* Verdict Info */}
          <div className="flex items-start gap-4">
            <div
              className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center shrink-0 text-white shadow-lg ${
                isDangerous
                  ? 'bg-gradient-to-tr from-rose-600 to-red-500 shadow-rose-500/30'
                  : isSuspicious
                  ? 'bg-gradient-to-tr from-amber-600 to-yellow-500 shadow-amber-500/30'
                  : 'bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-emerald-500/30'
              }`}
            >
              {isDangerous ? (
                <ShieldAlert className="w-10 h-10 animate-pulse" />
              ) : isSuspicious ? (
                <AlertTriangle className="w-10 h-10" />
              ) : (
                <ShieldCheck className="w-10 h-10" />
              )}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span
                  className={`px-3 py-1 text-xs font-extrabold uppercase tracking-wider rounded-lg ${
                    isDangerous
                      ? 'bg-rose-600 text-white'
                      : isSuspicious
                      ? 'bg-amber-600 text-white'
                      : 'bg-emerald-600 text-white'
                  }`}
                >
                  {result.verdict}
                </span>
                <span className="text-xs font-bold text-slate-700 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                  {result.category}
                </span>
                {result.details.isShortener && (
                  <span className="text-xs font-semibold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md">
                    Shortened Link
                  </span>
                )}
                {result.details.brandSpoofDetected && (
                  <span className="text-xs font-semibold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md">
                    Brand Spoof: {result.details.impersonatedBrand}
                  </span>
                )}
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {isDangerous
                  ? 'High Cyber Threat Detected!'
                  : isSuspicious
                  ? 'Suspicious Link - Proceed With Caution'
                  : 'Verified Safe Web Destination'}
              </h2>

              <p className="mt-2 text-sm sm:text-base text-slate-700 max-w-2xl font-normal leading-relaxed">
                {result.summary}
              </p>

              {/* Hindi / Hinglish translation banner */}
              {result.hindiSummary && (
                <div className="mt-3 p-3 bg-white/90 border border-slate-200/80 rounded-xl text-xs sm:text-sm font-medium text-slate-800 flex items-start gap-2 shadow-2xs">
                  <span className="font-bold text-emerald-700 shrink-0">हिंदी सारांश:</span>
                  <span>{result.hindiSummary}</span>
                </div>
              )}
            </div>
          </div>

          {/* Risk Score Radial Widget */}
          <div className="w-full lg:w-auto flex flex-row lg:flex-col items-center justify-between lg:justify-center p-4 bg-white rounded-2xl border border-slate-200 shadow-sm shrink-0 min-w-[200px]">
            <div className="text-center">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Risk Threat Score
              </span>
              <div className="flex items-baseline justify-center gap-1">
                <span
                  className={`text-4xl font-black ${
                    isDangerous ? 'text-rose-600' : isSuspicious ? 'text-amber-600' : 'text-emerald-600'
                  }`}
                >
                  {result.riskScore}
                </span>
                <span className="text-sm font-semibold text-slate-400">/ 100</span>
              </div>
            </div>

            {/* Meter bar */}
            <div className="w-32 lg:w-36 mt-2">
              <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
                <div
                  className={`h-full transition-all duration-1000 ${
                    isDangerous
                      ? 'bg-rose-500'
                      : isSuspicious
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.max(5, result.riskScore)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-bold text-slate-400 mt-1">
                <span>0 Safe</span>
                <span>50</span>
                <span>100 Danger</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Recommendation Box */}
        <div className="mt-6 pt-5 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-1.5 rounded-lg text-white ${
                isDangerous ? 'bg-rose-600' : isSuspicious ? 'bg-amber-600' : 'bg-emerald-600'
              }`}
            >
              <Info className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">Security Recommendation:</p>
              <p className="text-xs text-slate-600 font-medium">{result.recommendation}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isSafe && (
              <a
                href={result.normalizedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm shadow-emerald-600/30 transition-all"
              >
                <span>Visit Safely</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            <button
              type="button"
              onClick={handleDownloadQrCertificate}
              disabled={downloadingCert}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors shadow-2xs"
              title="Download QR code for this link"
            >
              <QrCode className="w-3.5 h-3.5 text-slate-600" />
              <span>{downloadingCert ? 'Generating...' : 'Get QR Code'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="mt-8 border-b border-slate-200">
        <nav className="flex items-center gap-2 overflow-x-auto pb-px">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'overview'
                ? 'border-emerald-600 text-emerald-800 bg-emerald-50/40 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Threat Checklist ({result.threatFactors.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('anatomy')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'anatomy'
                ? 'border-emerald-600 text-emerald-800 bg-emerald-50/40 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>URL Anatomy & DNS</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sandbox')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'sandbox'
                ? 'border-emerald-600 text-emerald-800 bg-emerald-50/40 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>Sandbox HTTP Probe</span>
          </button>
        </nav>
      </div>

      {/* Tab 1: Checklist & Threats */}
      {activeTab === 'overview' && (
        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {result.threatFactors.map((factor, idx) => {
              const isBad = factor.severity === 'high' || factor.severity === 'medium';
              const isGood = factor.severity === 'safe';

              return (
                <div
                  key={idx}
                  className={`p-4 rounded-2xl border transition-all ${
                    isBad
                      ? 'bg-rose-50/40 border-rose-200'
                      : isGood
                      ? 'bg-emerald-50/30 border-emerald-200'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                          isBad
                            ? 'bg-rose-600 text-white'
                            : isGood
                            ? 'bg-emerald-600 text-white'
                            : 'bg-amber-500 text-white'
                        }`}
                      >
                        {isBad ? (
                          <ShieldAlert className="w-3.5 h-3.5" />
                        ) : isGood ? (
                          <ShieldCheck className="w-3.5 h-3.5" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900">{factor.title}</h4>
                    </div>
                    <span
                      className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded ${
                        factor.severity === 'high'
                          ? 'bg-rose-100 text-rose-800'
                          : factor.severity === 'medium'
                          ? 'bg-amber-100 text-amber-800'
                          : factor.severity === 'safe'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-800'
                      }`}
                    >
                      {factor.severity}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed pl-8">{factor.description}</p>
                </div>
              );
            })}
          </div>

          {/* Quick Security Metrics Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
            <div className="p-3 bg-white rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Protocol</span>
              <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mt-0.5">
                {result.details.hasHttps ? (
                  <>
                    <Lock className="w-3.5 h-3.5 text-emerald-600" />
                    <span>HTTPS Encrypted</span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-3.5 h-3.5 text-rose-500" />
                    <span>Insecure HTTP</span>
                  </>
                )}
              </p>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase">DNS Status</span>
              <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mt-0.5">
                {result.dnsInfo.resolves ? (
                  <>
                    <Globe className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Active Resolved</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                    <span>Unresolved / Dead</span>
                  </>
                )}
              </p>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Host Type</span>
              <p className="text-xs font-bold text-slate-800 mt-0.5">
                {result.details.isIpAddress ? 'Raw IP Host' : 'Named Domain'}
              </p>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Link Cloaking</span>
              <p className="text-xs font-bold text-slate-800 mt-0.5">
                {result.details.isShortener ? 'Shortener Detected' : 'Direct Link'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: URL Anatomy & DNS Breakdown */}
      {activeTab === 'anatomy' && (
        <div className="mt-6 space-y-6">
          {/* Target URL decomposition */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-600" />
              <span>Full URL Decomposition</span>
            </h4>

            <div className="p-3 bg-slate-900 text-slate-100 rounded-xl font-mono text-xs break-all mb-4">
              {result.normalizedUrl}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <span className="text-slate-500 font-medium">Domain / Hostname</span>
                <p className="font-mono font-bold text-slate-900 mt-0.5">{result.domain || 'N/A'}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <span className="text-slate-500 font-medium">Protocol Scheme</span>
                <p className="font-mono font-bold text-slate-900 mt-0.5">{result.details.protocol}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <span className="text-slate-500 font-medium">Port</span>
                <p className="font-mono font-bold text-slate-900 mt-0.5">{result.details.port || 'Default'}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <span className="text-slate-500 font-medium">Path Directory Depth</span>
                <p className="font-mono font-bold text-slate-900 mt-0.5">{result.details.pathDepth} levels</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <span className="text-slate-500 font-medium">Query Parameters</span>
                <p className="font-mono font-bold text-slate-900 mt-0.5">{result.details.queryParamCount} params</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <span className="text-slate-500 font-medium">Suspicious TLD</span>
                <p className="font-mono font-bold text-slate-900 mt-0.5">
                  {result.details.hasSuspiciousTld ? 'Yes (Flagged)' : 'Normal TLD'}
                </p>
              </div>
            </div>
          </div>

          {/* DNS Lookup Information */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Server className="w-4 h-4 text-emerald-600" />
              <span>Public DNS Resolution & Server Routing</span>
            </h4>

            {result.dnsInfo.resolves ? (
              <div className="space-y-3">
                <div className="p-3 bg-emerald-50 border border-emerald-200/70 rounded-xl text-xs text-emerald-900">
                  <p className="font-bold">Active A / AAAA Records Found:</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {result.dnsInfo.ipAddresses.map((ip, i) => (
                      <span key={i} className="px-2.5 py-1 bg-white font-mono rounded-lg border border-emerald-200 text-slate-800">
                        {ip}
                      </span>
                    ))}
                  </div>
                </div>

                {result.dnsInfo.mxRecords && result.dnsInfo.mxRecords.length > 0 && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700">
                    <p className="font-bold mb-1.5">Mail Exchange (MX) Gateways:</p>
                    <ul className="list-disc list-inside space-y-1 font-mono text-[11px] text-slate-600">
                      {result.dnsInfo.mxRecords.map((mx, idx) => (
                        <li key={idx}>{mx}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
                <p className="font-bold">DNS Resolution Failed</p>
                <p className="mt-1">
                  The domain could not be resolved on public internet nameservers ({result.dnsInfo.error || 'NXDOMAIN'}). This could indicate an expired domain, an internal/private address, or a disposable host.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Sandbox HTTP Probe */}
      {activeTab === 'sandbox' && (
        <div className="mt-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-600" />
              <span>Server Response & Header Security Probe</span>
            </h4>
            <span className="text-xs text-slate-500">Safe Sandbox Inspection (No scripts executed)</span>
          </div>

          {result.httpProbe?.accessible ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">HTTP Status</span>
                  <p className="font-mono font-bold text-slate-900 text-sm mt-0.5">
                    {result.httpProbe.statusCode}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Response Time</span>
                  <p className="font-mono font-bold text-slate-900 text-sm mt-0.5">
                    {result.httpProbe.responseTimeMs} ms
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">HSTS Header</span>
                  <p className={`font-bold text-xs mt-0.5 ${result.httpProbe.hasHsts ? 'text-emerald-700' : 'text-slate-500'}`}>
                    {result.httpProbe.hasHsts ? 'Enabled (Secure)' : 'Not Set'}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Content Security</span>
                  <p className={`font-bold text-xs mt-0.5 ${result.httpProbe.hasCsp ? 'text-emerald-700' : 'text-slate-500'}`}>
                    {result.httpProbe.hasCsp ? 'CSP Configured' : 'No CSP'}
                  </p>
                </div>
              </div>

              {result.httpProbe.finalUrl && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Redirect Flow Detected:</span>
                    <p className="font-mono text-[11px] mt-1 break-all">{result.httpProbe.finalUrl}</p>
                  </div>
                </div>
              )}

              {result.httpProbe.serverHeader && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700">
                  <span className="font-semibold text-slate-500">Server Banner Header: </span>
                  <span className="font-mono font-bold">{result.httpProbe.serverHeader}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
              <p className="font-semibold text-slate-800">Connection probe could not complete</p>
              <p className="mt-1 text-slate-500">
                {result.httpProbe?.error || 'The remote web server was unreachable or refused connection.'}
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
