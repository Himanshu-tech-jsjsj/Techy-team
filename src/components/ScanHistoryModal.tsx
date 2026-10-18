import React from 'react';
import { History, X, Trash2, ArrowUpRight, ShieldCheck, ShieldAlert, AlertTriangle, ExternalLink } from 'lucide-react';
import { ScanHistoryItem } from '../types';

interface ScanHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: ScanHistoryItem[];
  onClear: () => void;
  onSelect: (url: string) => void;
}

export const ScanHistoryModal: React.FC<ScanHistoryModalProps> = ({
  isOpen,
  onClose,
  history,
  onClear,
  onSelect,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-100 rounded-xl text-slate-700">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Scan Audit History</h3>
              <p className="text-[11px] text-slate-500">Stored locally in your browser</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {history.length > 0 && (
              <button
                type="button"
                onClick={onClear}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100/70 rounded-lg transition-colors"
                title="Clear all history"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* List of items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {history.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <History className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="font-semibold text-slate-600">No scan history yet</p>
              <p className="mt-0.5">Scanned URLs and QR codes will appear here automatically.</p>
            </div>
          ) : (
            history.map((item) => {
              const isBad = item.verdict === 'DANGEROUS';
              const isSuspicious = item.verdict === 'SUSPICIOUS';
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    onSelect(item.url);
                    onClose();
                  }}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/80 hover:bg-slate-100/80 border border-slate-200/80 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1 pr-3">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-white ${
                        isBad
                          ? 'bg-rose-600'
                          : isSuspicious
                          ? 'bg-amber-500'
                          : 'bg-emerald-600'
                      }`}
                    >
                      {isBad ? (
                        <ShieldAlert className="w-4 h-4" />
                      ) : isSuspicious ? (
                        <AlertTriangle className="w-4 h-4" />
                      ) : (
                        <ShieldCheck className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900 truncate">
                          {item.domain || item.url}
                        </span>
                        <span
                          className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                            isBad
                              ? 'bg-rose-100 text-rose-800'
                              : isSuspicious
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {item.verdict}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate font-mono mt-0.5">
                        {item.url}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] font-bold text-slate-700 bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                      Score: {item.riskScore}
                    </span>
                    <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-slate-900 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
