'use client';

/**
 * BIKA v2 — Composed provider stack.
 *
 * Order matters:
 *   1. ThemeProvider      — needs to run before any styled component
 *   2. QueryProvider      — data layer
 *   3. LanguageProvider   — i18n
 *   4. Toaster            — needs nothing, but sits on top of everything
 *
 * Add new providers here. Never inline them in layout.tsx.
 */

import React from 'react';
import { QueryProvider } from './QueryProvider';
import { ThemeProvider } from '@/app/components/providers/ThemeProvider';
import { LanguageProvider } from '@/app/lib/i18n';
import { Toaster } from 'sonner';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <QueryProvider>
        <LanguageProvider>
          {children}
          <Toaster
            position="top-right"
            richColors
            closeButton
            duration={5000}
            toastOptions={{
              className: 'bika-toast',
            }}
          />
        </LanguageProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}
