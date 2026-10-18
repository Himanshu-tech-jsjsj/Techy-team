/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { ScannerHero } from './components/ScannerHero';
import { ScanningProgress } from './components/ScanningProgress';
import { ScanResultView } from './components/ScanResultView';
import { CameraScannerModal } from './components/CameraScannerModal';
import { ScanHistoryModal } from './components/ScanHistoryModal';
import { EducationalGuide } from './components/EducationalGuide';
import { Footer } from './components/Footer';
import { ScanResult, ScanHistoryItem } from './types';
import { SAMPLE_CASES, SampleItem, getSampleCasesWithQrs } from './utils/sampleData';
import { AlertCircle, RefreshCw } from 'lucide-react';

const HISTORY_STORAGE_KEY = 'safescan_guard_history_v1';

export default function App() {
  const [result, setResult] = useState<ScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanningTarget, setScanningTarget] = useState('');
  const [scanError, setScanError] = useState<string | null>(null);
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);
  const [sampleCases, setSampleCases] = useState<SampleItem[]>(SAMPLE_CASES);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [navTab, setNavTab] = useState<'url' | 'qr' | 'camera' | 'guide'>('url');

  const resultRef = useRef<HTMLDivElement>(null);
  const guideRef = useRef<HTMLDivElement>(null);

  // Load history & pre-render QR samples on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch {
      // ignore
    }

    getSampleCasesWithQrs().then((cases) => {
      setSampleCases(cases);
    });
  }, []);

  const saveHistoryItem = (item: ScanResult, source: 'url' | 'qr_upload' | 'camera') => {
    const newItem: ScanHistoryItem = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      url: item.url,
      domain: item.domain || item.url,
      verdict: item.verdict,
      riskScore: item.riskScore,
      category: item.category,
      timestamp: item.analyzedAt,
      sourceType: source,
    };

    setHistory((prev) => {
      const updated = [newItem, ...prev.filter((h) => h.url !== item.url)].slice(0, 25);
      try {
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  const handleClearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem(HISTORY_STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  const handleScan = async (target: string, sourceType: 'url' | 'qr_upload' | 'camera' = 'url') => {
    if (!target.trim()) return;

    setScanError(null);
    setIsScanning(true);
    setScanningTarget(target);
    setResult(null);

    // Scroll smoothly to progress
    setTimeout(() => {
      window.scrollTo({ top: 280, behavior: 'smooth' });
    }, 100);

    try {
      const response = await fetch('/api/scan-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: target.trim(),
          source: sourceType,
        }),
      });

      let data: ScanResult;
      if (response.ok) {
        data = await response.json();
      } else {
        // Fallback to client-side threat analysis if server returned non-200
        const { runClientSideScanFallback } = await import('./utils/clientFallback');
        data = runClientSideScanFallback(target, sourceType);
      }

      data.sourceType = sourceType;
      setResult(data);
      saveHistoryItem(data, sourceType);

      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 200);
    } catch (err: any) {
      console.warn('Network scan fetch failed, using instant client heuristics fallback:', err);
      try {
        const { runClientSideScanFallback } = await import('./utils/clientFallback');
        const fallbackData = runClientSideScanFallback(target, sourceType);
        setResult(fallbackData);
        saveHistoryItem(fallbackData, sourceType);

        setTimeout(() => {
          resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 200);
      } catch (fallbackErr: any) {
        setScanError('Unable to analyze target. Please check link format.');
      }
    } finally {
      setIsScanning(false);
    }
  };

  const handleNavSelect = (tab: 'url' | 'qr' | 'camera' | 'guide') => {
    setNavTab(tab);
    if (tab === 'camera') {
      setIsCameraOpen(true);
    } else if (tab === 'guide') {
      guideRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-emerald-500/20 selection:text-emerald-900">
      {/* Top Navigation */}
      <Navbar
        onOpenHistory={() => setIsHistoryOpen(true)}
        onSelectTab={handleNavSelect}
        activeTab={navTab}
        historyCount={history.length}
      />

      {/* Main Content */}
      <main className="flex-1">
        {/* Hero & Unified Search Bar */}
        <ScannerHero
          onScan={handleScan}
          isScanning={isScanning}
          sampleCases={sampleCases}
          onOpenLiveCamera={() => setIsCameraOpen(true)}
        />

        {/* Scan Error Banner */}
        {scanError && (
          <div className="max-w-2xl mx-auto my-6 px-4">
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 shadow-xs">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 text-xs">
                <p className="font-bold text-rose-900">Security Inspection Error</p>
                <p className="text-rose-700 mt-0.5">{scanError}</p>
                <button
                  type="button"
                  onClick={() => handleScan(scanningTarget)}
                  className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Retry Analysis</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Scanning in progress animation */}
        {isScanning && (
          <ScanningProgress targetUrl={scanningTarget} />
        )}

        {/* Scan Result Display */}
        {result && !isScanning && (
          <div ref={resultRef}>
            <ScanResultView
              result={result}
              onReset={() => {
                setResult(null);
                setScanningTarget('');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onRescan={(url) => handleScan(url)}
            />
          </div>
        )}

        {/* Scam Catalog & Educational Guide */}
        <div ref={guideRef}>
          <EducationalGuide
            onTestSample={(sampleUrl) => {
              handleScan(sampleUrl);
              window.scrollTo({ top: 180, behavior: 'smooth' });
            }}
          />
        </div>
      </main>

      {/* Live Camera Scanner Modal */}
      <CameraScannerModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onDetected={(qrPayload) => {
          setIsCameraOpen(false);
          handleScan(qrPayload, 'camera');
        }}
      />

      {/* Scan History Modal */}
      <ScanHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        onClear={handleClearHistory}
        onSelect={(url) => handleScan(url)}
      />

      {/* Footer */}
      <Footer />
    </div>
  );
}
