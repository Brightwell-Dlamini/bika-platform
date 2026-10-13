import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message: string;
  action?: React.ReactNode;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  action,
}: ErrorStateProps) {
  return (
    <div className="bg-slate-900 border border-red-500/40 rounded-2xl p-8 text-center space-y-3">
      <AlertTriangle className="w-10 h-10 text-red-400 mx-auto" />
      <div className="text-base font-bold text-white">{title}</div>
      <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">{message}</p>
      {action && <div className="pt-1">{action}</div>}
    </div>
  );
}
