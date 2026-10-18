import React, { useState, useRef } from 'react';
import { 
  Search, 
  QrCode, 
  UploadCloud, 
  Camera, 
  Clipboard, 
  X, 
  ArrowRight, 
  ShieldAlert, 
  ShieldCheck, 
  Zap, 
  Sparkles,
  FileImage,
  AlertTriangle
} from 'lucide-react';
import { decodeQrFromImageFile } from '../utils/qrDecoder';
import { SampleItem } from '../utils/sampleData';

interface ScannerHeroProps {
  onScan: (target: string, sourceType: 'url' | 'qr_upload' | 'camera') => void;
  isScanning: boolean;
  sampleCases: SampleItem[];
  onOpenLiveCamera: () => void;
}

export const ScannerHero: React.FC<ScannerHeroProps> = ({
  onScan,
  isScanning,
  sampleCases,
  onOpenLiveCamera,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [activeMode, setActiveMode] = useState<'url' | 'qr'>('url');
  const [dragActive, setDragActive] = useState(false);
  const [qrFileName, setQrFileName] = useState<string | null>(null);
  const [qrDecodeError, setQrDecodeError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputValue.trim() || isScanning) return;
    onScan(inputValue.trim(), 'url');
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setInputValue(text);
      }
    } catch {
      // ignore
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processUploadedQrFile(file);
  };

  const processUploadedQrFile = async (file: File) => {
    setQrDecodeError(null);
    setQrFileName(file.name);
    try {
      const decodedPayload = await decodeQrFromImageFile(file);
      setInputValue(decodedPayload);
      onScan(decodedPayload, 'qr_upload');
    } catch (err: any) {
      setQrDecodeError(err.message || 'Could not find a valid QR code in this image.');
    }
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processUploadedQrFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <section className="relative pt-10 pb-8 px-4 sm:px-6 max-w-5xl mx-auto">
      {/* Background ambient lighting for clean light theme */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-gradient-to-tr from-emerald-100/60 via-teal-50/40 to-sky-100/50 blur-3xl -z-10 pointer-events-none rounded-full" />

      {/* Top Banner Tag & Creator Badge */}
      <div className="flex flex-col items-center text-center">
        <div className="flex flex-wrap items-center justify-center gap-2 mb-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-slate-200/90 shadow-xs text-xs font-semibold text-slate-800">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Multi-Engine Phishing & QR Fraud Detection</span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-xs font-bold text-emerald-900 shadow-2xs">
            <span>Created by <span className="font-extrabold text-emerald-700">"Techy Team"</span></span>
            <span className="text-emerald-400">•</span>
            <span className="font-medium text-emerald-800">Himanshu singh <span className="text-[10px] font-bold text-emerald-600">(creater)</span></span>
            <span className="text-emerald-400">•</span>
            <span className="font-medium text-emerald-800">Abhishek kumar <span className="text-[10px] font-bold text-teal-600">(member)</span></span>
            <span className="text-emerald-400">•</span>
            <a href="tel:9453758073" className="text-emerald-700 hover:text-emerald-900 underline font-bold">
              Ph: 9453758073
            </a>
          </div>
        </div>

        {/* Hero Headline */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight max-w-3xl leading-[1.15]">
          Is That Link or QR Code <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">Safe to Open?</span>
        </h1>
        <p className="mt-3.5 text-sm sm:text-base text-slate-600 max-w-2xl font-normal leading-relaxed">
          Paste any unknown web URL, shortlink, or upload a suspicious QR code. Our AI security core analyzes domain reputation, SSL encryption, cloaking redirects, and credential-theft traps in milliseconds.
        </p>
      </div>

      {/* Main Unified Scanner Card */}
      <div className="mt-8 bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200/90 p-4 sm:p-6 transition-all">
        {/* Mode Selector Pill */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveMode('url')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeMode === 'url'
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>URL & Web Link</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveMode('qr')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeMode === 'qr'
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>QR Code Scanner</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenLiveCamera}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-emerald-700 bg-slate-50 hover:bg-emerald-50 px-3 py-1.5 rounded-xl border border-slate-200 transition-colors"
            >
              <Camera className="w-3.5 h-3.5 text-emerald-600" />
              <span>Live Camera QR</span>
            </button>
          </div>
        </div>

        {/* Input Bar Form */}
        <form onSubmit={handleSubmit} className="relative">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-1.5 bg-slate-50/80 rounded-2xl border-2 border-slate-200/90 focus-within:border-emerald-500 focus-within:bg-white focus-within:shadow-md transition-all">
            
            {/* Input Element */}
            <div className="relative flex-1 flex items-center min-w-0 pl-3">
              <Search className="w-5 h-5 text-slate-400 shrink-0 mr-2.5" />
              <input
                type="text"
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  setQrDecodeError(null);
                }}
                placeholder={
                  activeMode === 'url'
                    ? "Paste any unknown link here... (e.g., https://example.com/login?id=9)"
                    : "Upload QR below, or paste decoded URL / UPI payload here..."
                }
                className="w-full py-2.5 bg-transparent text-sm sm:text-base font-medium text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-hidden"
              />

              {/* Clear button */}
              {inputValue && (
                <button
                  type="button"
                  onClick={() => {
                    setInputValue('');
                    setQrFileName(null);
                    setQrDecodeError(null);
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg mr-1 transition-colors"
                  title="Clear input"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              {/* Quick Paste Clipboard Button */}
              <button
                type="button"
                onClick={handlePasteClipboard}
                className="hidden sm:flex items-center gap-1 px-2 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 rounded-lg border border-slate-200/80 mr-1.5 transition-colors shrink-0"
                title="Paste from clipboard"
              >
                <Clipboard className="w-3 h-3 text-slate-500" />
                <span>Paste</span>
              </button>

              {/* Upload QR trigger inside the bar */}
              <button
                type="button"
                onClick={() => {
                  if (activeMode !== 'qr') setActiveMode('qr');
                  fileInputRef.current?.click();
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-100/80 hover:bg-emerald-200/90 rounded-xl mr-1 transition-colors shrink-0"
                title="Upload QR Code Image"
              >
                <QrCode className="w-3.5 h-3.5 text-emerald-700" />
                <span className="hidden sm:inline">Upload QR</span>
              </button>
            </div>

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Scan Submit Action Button */}
            <button
              type="submit"
              disabled={!inputValue.trim() || isScanning}
              className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-white transition-all shadow-md shrink-0 ${
                !inputValue.trim() || isScanning
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                  : 'bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] shadow-emerald-600/30 cursor-pointer'
              }`}
            >
              {isScanning ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <span>Check Safety</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Error notification if QR decode failed */}
        {qrDecodeError && (
          <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800 animate-fade-in">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">{qrDecodeError}</p>
              <p className="text-rose-600 mt-0.5">
                Tip: Make sure the image contains a clear square QR code without severe blur or cropping. You can also try our live camera scanner.
              </p>
            </div>
            <button
              onClick={() => setQrDecodeError(null)}
              className="text-rose-400 hover:text-rose-700"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* QR Dropzone (visible if QR tab is selected) */}
        {activeMode === 'qr' && (
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`mt-4 p-6 sm:p-8 border-2 border-dashed rounded-2xl cursor-pointer text-center transition-all ${
              dragActive
                ? 'border-emerald-500 bg-emerald-50/60 scale-[1.01]'
                : 'border-slate-300 hover:border-emerald-400 bg-slate-50/50 hover:bg-emerald-50/20'
            }`}
          >
            <div className="w-12 h-12 mx-auto bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-700 mb-3 shadow-xs">
              <UploadCloud className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">
              Drag & drop any QR code image here, or <span className="text-emerald-700 underline">browse files</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Supports PNG, JPG, WEBP, or screenshot pastes (Ctrl+V). We will instantly decode and inspect the underlying URL or UPI payment string.
            </p>
            {qrFileName && (
              <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 bg-white border border-slate-200 rounded-full text-xs font-medium text-slate-700">
                <FileImage className="w-3.5 h-3.5 text-emerald-600" />
                <span>Uploaded: {qrFileName}</span>
              </div>
            )}
          </div>
        )}

        {/* Interactive Sample Cases for Instant Testing */}
        <div className="mt-5 pt-4 border-t border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Quick Test Examples:
            </span>
            <span className="text-[11px] text-slate-500">Click any sample to test safe vs dangerous detection</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {sampleCases.map((sample) => {
              const isDanger = sample.type === 'DANGEROUS';
              const isSuspicious = sample.type === 'SUSPICIOUS';
              return (
                <button
                  key={sample.id}
                  type="button"
                  onClick={() => {
                    setInputValue(sample.url);
                    setQrDecodeError(null);
                    onScan(sample.url, 'url');
                  }}
                  className="flex items-center gap-2.5 p-2 rounded-xl text-left bg-slate-50 hover:bg-slate-100/90 border border-slate-200/80 hover:border-slate-300 transition-all group cursor-pointer"
                >
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-white font-bold text-xs ${
                      isDanger
                        ? 'bg-rose-500'
                        : isSuspicious
                        ? 'bg-amber-500'
                        : 'bg-emerald-600'
                    }`}
                  >
                    {isDanger ? (
                      <ShieldAlert className="w-4 h-4" />
                    ) : isSuspicious ? (
                      <AlertTriangle className="w-4 h-4" />
                    ) : (
                      <ShieldCheck className="w-4 h-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-800 truncate group-hover:text-emerald-700 transition-colors">
                      {sample.name}
                    </p>
                    <p className="text-[10px] text-slate-500 truncate font-mono">
                      {sample.url.replace(/^https?:\/\//, '')}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Trust Badges */}
      <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        <div className="p-3 bg-white/60 rounded-2xl border border-slate-200/60 shadow-2xs">
          <p className="text-xs font-bold text-slate-900">Google AI Model</p>
          <p className="text-[11px] text-slate-500">Gemini 3.8 Flash Core</p>
        </div>
        <div className="p-3 bg-white/60 rounded-2xl border border-slate-200/60 shadow-2xs">
          <p className="text-xs font-bold text-slate-900">Live DNS & SSL</p>
          <p className="text-[11px] text-slate-500">Active Nameserver Audit</p>
        </div>
        <div className="p-3 bg-white/60 rounded-2xl border border-slate-200/60 shadow-2xs">
          <p className="text-xs font-bold text-slate-900">QR Payload Inspect</p>
          <p className="text-[11px] text-slate-500">UPI Fraud & Redirect Traps</p>
        </div>
        <div className="p-3 bg-white/60 rounded-2xl border border-slate-200/60 shadow-2xs">
          <p className="text-xs font-bold text-slate-900">Privacy First</p>
          <p className="text-[11px] text-slate-500">Zero Target User Logging</p>
        </div>
      </div>
    </section>
  );
};
