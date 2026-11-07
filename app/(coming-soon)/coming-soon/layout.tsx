import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'BIKA — Coming Soon',
  description:
    'BIKA is preparing to launch. Kingdom of Eswatini incident and public safety reporting.',
  robots: { index: true, follow: true },
};

/**
 * Fully isolated shell — no public header, bottom nav, or ops chrome.
 */
export default function ComingSoonLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#05080f] text-slate-100 antialiased">{children}</div>
  );
}
