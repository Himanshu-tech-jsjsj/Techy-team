import React from 'react';
import { ShieldAlert, QrCode, Smartphone, Link2, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';

interface EducationalGuideProps {
  onTestSample: (url: string) => void;
}

export const EducationalGuide: React.FC<EducationalGuideProps> = ({ onTestSample }) => {
  return (
    <section className="max-w-5xl mx-auto my-12 px-4 sm:px-6">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full uppercase tracking-wider">
          Cyber Defense Knowledge Base
        </span>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 tracking-tight">
          How to Spot Dangerous Links & Scam QR Codes
        </h2>
        <p className="text-sm text-slate-600 mt-2">
          Recognize the signature patterns used by threat actors to steal banking passwords, install spyware, and trick UPI users.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: UPI QR Scams */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-rose-100 text-rose-700 rounded-2xl">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">UPI / Payment QR Frauds</h3>
              <p className="text-xs text-rose-600 font-semibold">The "Receive Money" Trap</p>
            </div>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed mb-4">
            Scammers send QR codes claiming you will "Receive ₹5,000 lottery or electricity refund". Scanning or approving these sends a debit request to your bank.
          </p>
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 font-medium space-y-1 mb-4">
            <p className="font-bold">Golden Rule:</p>
            <p>You NEVER need to enter your UPI PIN or scan a QR code to receive money into your account. Scanning always DEBITS your balance.</p>
          </div>
          <button
            type="button"
            onClick={() => onTestSample('upi://pay?pa=cashback-reward-claims@okaxis&pn=Electricity%20Cashback%20Refund&am=5000&cu=INR')}
            className="flex items-center gap-1.5 text-xs font-bold text-rose-700 hover:text-rose-800 hover:underline"
          >
            <span>Test UPI Scam Sample in Scanner</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Card 2: Phishing & Typosquatting */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-amber-100 text-amber-700 rounded-2xl">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Typosquatting & Fake Logins</h3>
              <p className="text-xs text-amber-700 font-semibold">Impersonating Trusted Brands</p>
            </div>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed mb-4">
            Attackers create lookalike domains such as <span className="font-mono bg-slate-100 px-1 py-0.5 rounded">paypa1-security.com</span> or <span className="font-mono bg-slate-100 px-1 py-0.5 rounded">sbi-kyc-update.xyz</span> to siphon credentials.
          </p>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 font-medium space-y-1 mb-4">
            <p className="font-bold">Checklist:</p>
            <p>Always inspect the root domain before the first slash. Official companies rarely host banking portals on .xyz, .top, or .buzz domains.</p>
          </div>
          <button
            type="button"
            onClick={() => onTestSample('http://secure-paypal-login-account-update.top/auth/verify.php?token=9284')}
            className="flex items-center gap-1.5 text-xs font-bold text-amber-700 hover:text-amber-800 hover:underline"
          >
            <span>Test Fake PayPal Login Sample</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Card 3: Android APK Malware Traps */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-red-100 text-red-700 rounded-2xl">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Malicious APK Download Traps</h3>
              <p className="text-xs text-red-700 font-semibold">Sideloading Trojan Applications</p>
            </div>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed mb-4">
            Fraudulent SMS messages ask users to download an ".apk" package file under the pretext of updating PAN card, e-challan, or gas subsidies. Once installed, it steals SMS OTPs.
          </p>
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900 font-medium space-y-1 mb-4">
            <p className="font-bold">Safety Rule:</p>
            <p>Never install applications from unknown website links or WhatsApp forward links. Only install verified apps via Google Play Store or Apple App Store.</p>
          </div>
          <button
            type="button"
            onClick={() => onTestSample('http://sbi-reward-points-kyc-verify.xyz/download/update_sbi_banking.apk')}
            className="flex items-center gap-1.5 text-xs font-bold text-red-700 hover:text-red-800 hover:underline"
          >
            <span>Test Malicious APK Link Sample</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Card 4: URL Shortener Cloaking */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-purple-100 text-purple-700 rounded-2xl">
              <Link2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Cloaked URL Shorteners</h3>
              <p className="text-xs text-purple-700 font-semibold">Hiding Malicious Payloads</p>
            </div>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed mb-4">
            Services like bit.ly, tinyurl, and t.co are frequently abused to conceal dangerous landing pages from spam filters. SafeScan inspects the destination through sandbox HTTP probe.
          </p>
          <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-900 font-medium space-y-1 mb-4">
            <p className="font-bold">Recommendation:</p>
            <p>Always paste unknown shortlinks into SafeScan Guard to expand and verify the destination before clicking on mobile.</p>
          </div>
          <button
            type="button"
            onClick={() => onTestSample('https://bit.ly/urgent-security-action-account-alert')}
            className="flex items-center gap-1.5 text-xs font-bold text-purple-700 hover:text-purple-800 hover:underline"
          >
            <span>Test Cloaked Shortlink Sample</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </section>
  );
};
