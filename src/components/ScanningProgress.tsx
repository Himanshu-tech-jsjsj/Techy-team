import React, { useEffect, useState } from 'react';
import { ShieldCheck, ShieldAlert, Globe, Lock, Cpu, Search, CheckCircle2 } from 'lucide-react';

interface ScanningProgressProps {
  targetUrl: string;
}

const STEPS = [
  { id: 1, label: 'Resolving DNS records & active IP routing', icon: Globe },
  { id: 2, label: 'Inspecting SSL/TLS certificate & security headers', icon: Lock },
  { id: 3, label: 'Evaluating brand spoofing, typosquatting & phishing heuristics', icon: Search },
  { id: 4, label: 'Running deep threat analysis via Google Gemini Intelligence', icon: Cpu },
  { id: 5, label: 'Finalizing risk index calculation & safety verdict', icon: ShieldCheck },
];

export const ScanningProgress: React.FC<ScanningProgressProps> = ({ targetUrl }) => {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < STEPS.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 450);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="max-w-2xl mx-auto my-10 p-6 sm:p-8 bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-200/90 text-center animate-fade-in">
      {/* Radar Pulse Animation */}
      <div className="relative w-24 h-24 mx-auto mb-6 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-emerald-400/20 animate-ping" />
        <div className="absolute inset-2 rounded-full bg-emerald-500/10 animate-pulse" />
        <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
          <Cpu className="w-8 h-8 animate-spin" style={{ animationDuration: '6s' }} />
        </div>
      </div>

      <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
        Deep Security Audit in Progress
      </h3>
      <p className="text-xs font-mono text-slate-500 mt-1 max-w-md mx-auto truncate px-3 py-1 bg-slate-100 rounded-lg">
        {targetUrl}
      </p>

      {/* Step by step checklist progress */}
      <div className="mt-8 space-y-3 text-left max-w-md mx-auto">
        {STEPS.map((step, idx) => {
          const isDone = currentStep > idx;
          const isCurrent = currentStep === idx;
          const Icon = step.icon;

          return (
            <div
              key={step.id}
              className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${
                isDone
                  ? 'bg-emerald-50/60 border-emerald-200/60 text-slate-800'
                  : isCurrent
                  ? 'bg-white border-emerald-400 shadow-sm text-slate-900 ring-2 ring-emerald-500/10'
                  : 'bg-slate-50/50 border-slate-200/40 text-slate-400 opacity-60'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                  isDone
                    ? 'bg-emerald-600 text-white'
                    : isCurrent
                    ? 'bg-emerald-100 text-emerald-800 animate-pulse'
                    : 'bg-slate-200 text-slate-500'
                }`}
              >
                {isDone ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <Icon className="w-3.5 h-3.5" />
                )}
              </div>
              <span className={`text-xs font-medium flex-1 ${isCurrent ? 'font-semibold text-emerald-950' : ''}`}>
                {step.label}
              </span>
              {isCurrent && (
                <div className="w-3.5 h-3.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin shrink-0" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
