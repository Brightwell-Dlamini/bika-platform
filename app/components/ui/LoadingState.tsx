import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
  /** Center vertically with generous padding. */
  full?: boolean;
  /** Show skeleton placeholder rows instead of a spinner. */
  skeleton?: boolean;
  rows?: number;
}

export function LoadingState({
  message = 'Loading…',
  full,
  skeleton,
  rows = 3,
}: LoadingStateProps) {
  if (skeleton) {
    return (
      <div className={`space-y-3 ${full ? 'py-12' : 'py-4'}`} aria-busy="true" aria-label={message}>
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="h-16 rounded-2xl bg-slate-800/80 border border-slate-800 animate-shimmer"
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-center text-slate-500 text-sm ${
        full ? 'py-24' : 'py-12'
      }`}
      role="status"
    >
      <Loader2 className="w-4 h-4 animate-spin mr-2" />
      {message}
    </div>
  );
}
