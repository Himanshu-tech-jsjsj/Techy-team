import React from 'react';
import { ShieldCheck, QrCode, History, Phone, ShieldAlert, Cpu, Users } from 'lucide-react';

interface NavbarProps {
  onOpenHistory: () => void;
  onSelectTab: (tab: 'url' | 'qr' | 'camera' | 'guide') => void;
  activeTab: 'url' | 'qr' | 'camera' | 'guide';
  historyCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenHistory,
  onSelectTab,
  activeTab,
  historyCount,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-white/90 backdrop-blur-md border-b border-slate-200/80 transition-all">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <div 
          onClick={() => onSelectTab('url')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform duration-200">
            <ShieldCheck className="w-5 h-5" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 tracking-tight text-lg">SafeScan</span>
              <span className="px-1.5 py-0.5 text-[10px] font-bold tracking-wider uppercase bg-emerald-100 text-emerald-800 rounded">AI Guard</span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">by <span className="font-bold text-slate-700">Techy Team</span> (Himanshu & Abhishek)</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/70">
          <button
            type="button"
            onClick={() => onSelectTab('url')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'url'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            URL Checker
          </button>
          <button
            type="button"
            onClick={() => onSelectTab('qr')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'qr'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <QrCode className="w-3.5 h-3.5 text-emerald-600" />
            QR Upload
          </button>
          <button
            type="button"
            onClick={() => onSelectTab('guide')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'guide'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
            Scam Catalog
          </button>
        </nav>

        {/* Right Action buttons */}
        <div className="flex items-center gap-2">
          {/* Creator Phone Contact badge */}
          <a
            href="tel:9453758073"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100/80 rounded-xl border border-emerald-200/70 transition-colors shadow-2xs"
            title="Creator Contact: 9453758073 (Himanshu singh)"
          >
            <Phone className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Call:</span>
            <span>9453758073</span>
          </a>

          <button
            type="button"
            onClick={onOpenHistory}
            className="relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-xs transition-colors cursor-pointer"
            title="Scan History"
          >
            <History className="w-4 h-4 text-slate-600" />
            <span className="hidden lg:inline">History</span>
            {historyCount > 0 && (
              <span className="w-4 h-4 flex items-center justify-center text-[10px] font-bold bg-slate-900 text-white rounded-full">
                {historyCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
