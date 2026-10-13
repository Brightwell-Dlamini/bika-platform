'use client';

/**
 * BIKA v2 — TanStack Query provider.
 *
 * Defaults are tuned for a civic platform:
 * - Queries: 30s stale, 5min cache. Reference data overrides via options.
 * - Mutations: no retry (fail fast; user sees the error).
 * - Refetch on focus: off for reports (they're not a chat app), on for lists.
 * - Refetch on reconnect: on (mobile networks are flaky).
 */

import React, { useState } from 'react';
import {
  QueryClient,
  QueryClientProvider,
  type DefaultOptions,
} from '@tanstack/react-query';

const defaultOptions: DefaultOptions = {
  queries: {
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry: (failureCount, error) => {
      // Don't retry on 4xx — they're permanent.
      if (error && typeof error === 'object' && 'status' in error) {
        const status = (error as { status: number }).status;
        if (status >= 400 && status < 500) return false;
      }
      return failureCount < 2;
    },
  },
  mutations: {
    retry: false,
  },
};

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions,
      })
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
