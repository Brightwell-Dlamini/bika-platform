'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[BIKA] page error', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-slate-900 border border-red-500/30 rounded-3xl p-8 text-center space-y-4 shadow-2xl">
        <h1 className="text-xl font-black text-white">Something went wrong</h1>
        <p className="text-sm text-slate-400 leading-relaxed">
          The page hit an unexpected error. You can try again or return to the portal.
        </p>
        {error.digest && (
          <p className="text-[10px] font-mono text-slate-600">Ref: {error.digest}</p>
        )}
        <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
          <button
            type="button"
            onClick={reset}
            className="px-5 py-3 rounded-xl bg-yellow-500 text-slate-950 text-xs font-black"
          >
            Try again
          </button>
          <Link
            href="/report"
            className="px-5 py-3 rounded-xl bg-slate-800 text-slate-200 text-xs font-bold border border-slate-700"
          >
            Public portal
          </Link>
        </div>
      </div>
    </div>
  );
}
