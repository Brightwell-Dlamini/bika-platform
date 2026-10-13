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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <PublicHeader />
      {/* Extra bottom pad for raised FAB (h-17 + safe area) */}
      <main id="main-content" className="flex-1 w-full pb-24 md:pb-0" tabIndex={-1}>
        {children}
      </main>
      <PublicFooter />
      <PublicMobileNav />
    </div>
  );
}
