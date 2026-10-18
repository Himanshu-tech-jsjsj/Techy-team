import QRCode from 'qrcode';

export interface SampleItem {
  id: string;
  name: string;
  tag: string;
  url: string;
  type: 'SAFE' | 'SUSPICIOUS' | 'DANGEROUS';
  description: string;
  qrDataUrl?: string;
}

export const SAMPLE_CASES: SampleItem[] = [
  {
    id: 'google-safe',
    name: 'Google Workspace',
    tag: 'Legitimate Global Domain',
    url: 'https://workspace.google.com',
    type: 'SAFE',
    description: 'Verified HTTPS certificate, official root nameservers, zero threat signatures.',
  },
  {
    id: 'paypal-phishing',
    name: 'PayPal Account Phishing',
    tag: 'Brand Impersonation & Typosquatting',
    url: 'http://secure-paypal-login-account-update.top/auth/verify.php?token=9284',
    type: 'DANGEROUS',
    description: 'Impersonates PayPal brand with unencrypted HTTP and suspicious disposable .top TLD.',
  },
  {
    id: 'sbi-kyc-apk',
    name: 'Bank KYC APK Malware Trap',
    tag: 'Malicious Android APK Delivery',
    url: 'http://sbi-reward-points-kyc-verify.xyz/download/update_sbi_banking.apk',
    type: 'DANGEROUS',
    description: 'Targets mobile users with fake banking rewards to download an unauthorized APK trojan.',
  },
  {
    id: 'upi-cashback-fraud',
    name: 'Fake UPI 5000 Cashback QR',
    tag: 'Financial UPI Fraud Intent',
    url: 'upi://pay?pa=cashback-reward-claims@okaxis&pn=Electricity%20Cashback%20Refund&am=5000&cu=INR',
    type: 'DANGEROUS',
    description: 'Disguised as receiving cashback, but triggers a direct bank debit request from user account.',
  },
  {
    id: 'cloaked-shortener',
    name: 'Cloaked Bitly Link',
    tag: 'Hidden Destination Redirect',
    url: 'https://bit.ly/urgent-security-action-account-alert',
    type: 'SUSPICIOUS',
    description: 'Uses a public URL shortener to hide actual destination and circumvent initial email filters.',
  },
];

/**
 * Pre-generate QR data URLs for sample items
 */
export async function getSampleCasesWithQrs(): Promise<SampleItem[]> {
  const list = [...SAMPLE_CASES];
  for (const item of list) {
    try {
      item.qrDataUrl = await QRCode.toDataURL(item.url, {
        margin: 1,
        width: 180,
        color: {
          dark: item.type === 'DANGEROUS' ? '#b91c1c' : item.type === 'SUSPICIOUS' ? '#b45309' : '#047857',
          light: '#ffffff',
        },
      });
    } catch (e) {
      console.warn('Failed to pre-render QR', e);
    }
  }
  return list;
}
