'use client';

import React, { forwardRef, useState } from 'react';
import { Send, Lock, Globe, Loader2, MessageSquarePlus } from 'lucide-react';
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

    const submit = (e?: React.FormEvent) => {
      e?.preventDefault();
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

    const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!mutation.isPending && body.trim().length > 0) submit();
      }
    };

    return (
      <form
        onSubmit={submit}
        className="relative overflow-hidden rounded-3xl border border-slate-800/70 bg-[#0a0e16] shadow-2xl shadow-black/40"
      >
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top_right,_rgba(52,211,153,0.05),_transparent_50%)]" />
        <div className="relative p-4 sm:p-5 space-y-3.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <MessageSquarePlus className="w-4 h-4 text-yellow-400" />
              <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                Compose note
              </span>
            </div>
            {canPostInternal && (
              <div className="flex items-center gap-0.5 bg-black/40 border border-white/10 rounded-xl p-0.5 text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setIsPublic(true)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition ${
                    isPublic
                      ? 'bg-emerald-500/20 text-emerald-300 shadow-inner'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <Globe className="w-3 h-3" /> Public
                </button>
                <button
                  type="button"
                  onClick={() => setIsPublic(false)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition ${
                    !isPublic
                      ? 'bg-purple-500/20 text-purple-300 shadow-inner'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <Lock className="w-3 h-3" /> Internal
                </button>
              </div>
            )}
          </div>

          {canPostInternal && (
            <div className="flex flex-wrap gap-1.5">
              {OFFICER_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => applyTemplate(t.id)}
                  className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-black/30 border border-white/10 text-slate-400 hover:border-yellow-500/40 hover:text-yellow-300 transition"
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
            onKeyDown={onKeyDown}
            placeholder={
              isPublic
                ? 'Visible to the citizen… (Ctrl/⌘+Enter to post)'
                : 'Internal note — invisible to the citizen (Ctrl/⌘+Enter to post)'
            }
            className="w-full bg-black/40 border border-white/10 rounded-2xl px-3.5 py-3 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-yellow-500/50 resize-none leading-relaxed"
          />

          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] text-slate-600">
              {isPublic ? 'Citizen can see this' : 'Staff only'}
            </span>
            <button
              type="submit"
              disabled={mutation.isPending || body.trim().length === 0}
              className="inline-flex items-center gap-1.5 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-extrabold text-xs px-4 py-2.5 rounded-xl disabled:opacity-40 shadow-lg shadow-yellow-500/15"
            >
              {mutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              Post
            </button>
          </div>
        </div>
      </form>
    );
  }
);
