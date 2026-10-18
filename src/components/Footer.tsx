import React from 'react';
import { ShieldCheck, Cpu, Lock, Phone, UserCheck, Users, MessageSquare, Mail } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-20 border-t border-slate-200/80 bg-white/80 backdrop-blur-md pt-12 pb-10 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Creator & Team Showcase Box */}
        <div className="p-6 bg-gradient-to-r from-emerald-50/70 via-teal-50/40 to-slate-50 border border-emerald-200/70 rounded-3xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 text-center md:text-left">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/20">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100/90 px-2.5 py-0.5 rounded-full">
                  Official Development
                </span>
                <span className="text-sm font-extrabold text-slate-900">
                  Created by <span className="text-emerald-700 font-black">"Techy Team"</span>
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-1 mt-1 text-xs text-slate-700">
                <span className="font-semibold flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Himanshu singh <span className="text-slate-500 font-normal">(creater)</span>
                </span>
                <span className="text-slate-300 hidden sm:inline">•</span>
                <span className="font-semibold flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-teal-600" />
                  Abhishek kumar <span className="text-slate-500 font-normal">(member)</span>
                </span>
              </div>
            </div>
          </div>

          {/* Contact Actions: Phone, WhatsApp, and Consultation Mail */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 shrink-0">
            <a
              href="tel:9453758073"
              className="flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 shadow-2xs hover:border-emerald-300 transition-all group"
              title="Call Creator: 9453758073"
            >
              <Phone className="w-3.5 h-3.5 text-emerald-600 group-hover:scale-110 transition-transform" />
              <span>9453758073</span>
            </a>

            <a
              href="mailto:hs25122208@gmail.com?subject=Consultation%20Query%20-%20SafeScan%20Guard"
              className="flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-800 shadow-2xs hover:bg-emerald-50/50 transition-all group"
              title="Consultation Mail: hs25122208@gmail.com"
            >
              <Mail className="w-3.5 h-3.5 text-emerald-600 group-hover:scale-110 transition-transform" />
              <span>hs25122208@gmail.com</span>
            </a>

            <a
              href="https://wa.me/919453758073"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-emerald-600/20 transition-all hover:scale-[1.02]"
              title="Chat on WhatsApp"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </a>
          </div>
        </div>

        {/* Secondary Info */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left pt-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">SafeScan Guard Security Intelligence</p>
              <p className="text-xs text-slate-500">Autonomous cyber threat detection for unknown links & QR codes</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5 text-emerald-600" /> Powered by Google Gemini AI
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-emerald-600" /> Zero Log Privacy
            </span>
            <span>•</span>
            <span>Created by Techy Team</span>
          </div>
        </div>

        {/* Copyright & Direct Consultation Contact */}
        <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-2">
          <p>© {new Date().getFullYear()} SafeScan Guard • Developed by Techy Team (Himanshu singh & Abhishek kumar)</p>
          <p className="flex flex-wrap items-center gap-2">
            <span>For Consult:</span>
            <a href="mailto:hs25122208@gmail.com" className="font-semibold text-emerald-700 hover:underline">
              hs25122208@gmail.com
            </a>
            <span>•</span>
            <span>Phone: +91 9453758073</span>
          </p>
        </div>
      </div>
    </footer>
  );
};
