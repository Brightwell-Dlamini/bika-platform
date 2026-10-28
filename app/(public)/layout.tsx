'use client';

import React from 'react';
import { PublicHeader } from '@/app/components/PublicHeader';
import { PublicFooter } from '@/app/components/PublicFooter';
import { PublicMobileNav } from '@/app/components/PublicMobileNav';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col relative">
      {/* Soft ambient glow for premium depth */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-40"
        aria-hidden
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(234,179,8,0.07), transparent 55%), radial-gradient(ellipse 50% 40% at 100% 50%, rgba(16,185,129,0.04), transparent 50%), radial-gradient(ellipse 50% 40% at 0% 80%, rgba(59,130,246,0.04), transparent 50%)',
        }}
      />
      <div className="relative z-10 flex flex-col min-h-screen">
        <PublicHeader />
        {/* Extra bottom pad for raised FAB (h-17 + safe area) */}
        <main id="main-content" className="flex-1 w-full pb-24 md:pb-0" tabIndex={-1}>
          {children}
        </main>
        <PublicFooter />
        <PublicMobileNav />
      </div>
    </div>
  );
}
