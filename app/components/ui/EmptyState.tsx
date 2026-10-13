import React from 'react';

interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  body?: string;
  action?: React.ReactNode;
}

export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
}: EmptyStateProps) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center space-y-3">
      {Icon && (
        <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto">
          <Icon className="w-5 h-5 text-slate-500" />
        </div>
      )}
      <div className="space-y-1">
        <div className="text-sm font-semibold text-slate-200">{title}</div>
        {body && (
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">{body}</p>
        )}
      </div>
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}
