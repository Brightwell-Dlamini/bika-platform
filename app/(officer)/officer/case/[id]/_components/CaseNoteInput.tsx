'use client';

import React, { forwardRef, useState } from 'react';
import { Send, Lock, Globe, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAddNote } from '@/app/lib/api/mutations/useIncidentActions';
import { OFFICER_TEMPLATES } from '@/app/lib/officerTemplates';
import type { UserRole } from '@/app/types';

interface CaseNoteInputProps {
  incidentId: string;
  currentRole: UserRole;
}

export const CaseNoteInput = forwardRef<HTMLTextAreaElement, CaseNoteInputProps>(
  function CaseNoteInput({ incidentId, currentRole }, ref) {
    const [body, setBody] = useState('');
    const [isPublic, setIsPublic] = useState(true);
    const mutation = useAddNote(incidentId);

    const canPostInternal = currentRole !== 'public';

    const applyTemplate = (templateId: string) => {
      const t = OFFICER_TEMPLATES.find((x) => x.id === templateId);
      if (!t) return;
      setBody(t.body);
      if (t.preferPublic !== undefined) setIsPublic(t.preferPublic);
    };

    const submit = (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = body.trim();
      if (trimmed.length < 1) {
        toast.error('Write a note before posting.');
        return;
      }
      mutation.mutate(
        { body: trimmed, isPublic },
        {
          onSuccess: () => {
            setBody('');
            toast.success(isPublic ? 'Public note added.' : 'Internal note added.');
          },
          onError: (err) => toast.error(err.message),
        }
      );
    };

    return (
      <form
        onSubmit={submit}
        className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3"
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            Add note
          </span>
          {canPostInternal && (
            <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-[10px] font-bold">
              <button
                type="button"
                onClick={() => setIsPublic(true)}
                className={`flex items-center gap-1 px-2 py-1 rounded-md transition ${
                  isPublic ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-500'
                }`}
              >
                <Globe className="w-3 h-3" /> Public
              </button>
              <button
                type="button"
                onClick={() => setIsPublic(false)}
                className={`flex items-center gap-1 px-2 py-1 rounded-md transition ${
                  !isPublic ? 'bg-purple-500/20 text-purple-300' : 'text-slate-500'
                }`}
              >
                <Lock className="w-3 h-3" /> Internal
              </button>
            </div>
          )}
        </div>

        {/* Quick templates */}
        {canPostInternal && (
          <div className="flex flex-wrap gap-1.5">
            {OFFICER_TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => applyTemplate(t.id)}
                className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-700 text-slate-300 hover:border-yellow-500/50 hover:text-yellow-300 transition"
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        <textarea
          ref={ref}
          rows={3}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={
            isPublic ? 'Visible to the citizen…' : 'Internal note — invisible to the citizen'
          }
          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-500 resize-none"
        />

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={mutation.isPending || body.trim().length === 0}
            className="inline-flex items-center gap-1.5 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-extrabold text-xs px-4 py-2 rounded-xl disabled:opacity-50"
          >
            {mutation.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            Post
          </button>
        </div>
      </form>
    );
  }
);
