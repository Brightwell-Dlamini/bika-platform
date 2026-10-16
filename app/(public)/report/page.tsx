'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { z } from 'zod';
import { zCitizenReportSubmission } from '@/app/lib/schemas';
import { useSubmitReport } from '@/app/lib/api/mutations/useSubmitReport';
import { rememberReport } from '@/app/lib/myReports';
import { useDraft } from '@/app/lib/hooks/useDraft';
import type { Attachment, Mode, ReportType } from '@/app/types';
import { ProgressBar, type ReportStep } from './_components/ProgressBar';
import { SectorStep } from './_components/SectorStep';
import { TypeStep } from './_components/TypeStep';
import { DetailsStep } from './_components/DetailsStep';
import { ReviewStep } from './_components/ReviewStep';
import { SuccessStep } from './_components/SuccessStep';

type DetailsValues = z.infer<typeof zCitizenReportSubmission>;

const DRAFT_KEY = 'report:v2';

interface DraftShape {
  step: ReportStep;
  mode: Mode;
  reportType: ReportType;
  values: Partial<DetailsValues>;
  attachments: Attachment[];
}

export default function ReportPage() {
  const router = useRouter();
  const [step, setStep] = useState<ReportStep>('sector');
  const [mode, setMode] = useState<Mode>('Road Transport');
  const [reportType, setReportType] = useState<ReportType>('incident');
  const [values, setValues] = useState<Partial<DetailsValues>>({});
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [createdReference, setCreatedReference] = useState<string | null>(null);

  const draftValue = useMemo<DraftShape>(
    () => ({ step, mode, reportType, values, attachments }),
    [step, mode, reportType, values, attachments]
  );

  const draft = useDraft<DraftShape>(DRAFT_KEY, draftValue, {
    enabled: step !== 'success',
  });

  const [restored, setRestored] = useState(false);
  useEffect(() => {
    if (restored || !draft.isRestored || !draft.data) return;
    setRestored(true);
    const d = draft.data;
    if (d.step && d.step !== 'sector') {
      setStep(d.step);
      setMode(d.mode);
      setReportType(d.reportType);
      setValues(d.values ?? {});
      setAttachments(d.attachments ?? []);
      toast.info('Resumed from your saved draft.', { duration: 4000 });
    }
  }, [draft, restored]);

  // Keep the active step in view after advances (mobile-friendly)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const id = window.setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      const main = document.getElementById('main-content');
      main?.focus({ preventScroll: true });
    }, 50);
    return () => window.clearTimeout(id);
  }, [step]);

  const submitMutation = useSubmitReport();

  const handleConfirmSubmit = async () => {
    const parsed = zCitizenReportSubmission.safeParse({
      ...values,
      mode,
      reportType,
      attachments,
    });

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      toast.error(issue?.message ?? 'Please review your report before submitting.');
      setStep('details');
      return;
    }

    submitMutation.mutate(parsed.data, {
      onSuccess: (data) => {
        const ref = data.incident.id;
        setCreatedReference(ref);

        rememberReport({
          id: ref,
          category: data.incident.category,
          location: data.incident.location,
          status: data.incident.status,
          reportType: data.incident.reportType,
          createdAt: data.incident.createdAt,
          region: data.incident.region,
        });
        window.dispatchEvent(new Event('bika-my-reports'));

        draft.clear();
        setStep('success');
        toast.success(`Reference ${ref} saved.`, { duration: 5000 });
      },
      onError: (error) => {
        toast.error(error.message || 'Could not submit report. Please try again.');
      },
    });
  };

  const handleTrackCurrent = () => {
    if (createdReference) {
      router.push(`/r/${encodeURIComponent(createdReference)}`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {step !== 'sector' && <ProgressBar step={step} />}

      {step === 'sector' && (
        <SectorStep
          onSelect={(m) => {
            setMode(m);
            setStep('type');
          }}
          onTrack={() => router.push('/track')}
        />
      )}

      {step === 'type' && (
        <TypeStep
          mode={mode}
          onChangeMode={setMode}
          onBack={() => setStep('sector')}
          onSelect={(t) => {
            setReportType(t);
            setValues((v) => ({
              ...v,
              reportType: t,
              mode,
              severity: t === 'emergency' ? 'CRITICAL' : v.severity ?? 'MEDIUM',
            }));
            setStep('details');
          }}
        />
      )}

      {step === 'details' && (
        <DetailsStep
          mode={mode}
          reportType={reportType}
          defaultValues={values}
          attachments={attachments}
          onAddAttachment={(a) => setAttachments((prev) => [...prev, a])}
          onRemoveAttachment={(id) =>
            setAttachments((prev) => prev.filter((a) => a.id !== id))
          }
          onBack={() => setStep('type')}
          onNext={(v) => {
            setValues(v);
            setStep('review');
          }}
        />
      )}

      {step === 'review' && (
        <ReviewStep
          sector={mode}
          reportType={reportType}
          region={String(values.region ?? '')}
          category={String(values.category ?? '')}
          location={String(values.location ?? '')}
          description={String(values.description ?? '')}
          severity={String(values.severity ?? '')}
          attachments={attachments}
          isAnonymous={Boolean(values.isAnonymous)}
          submitting={submitMutation.isPending}
          onEdit={() => setStep('details')}
          onConfirm={handleConfirmSubmit}
        />
      )}

      {step === 'success' && createdReference && (
        <SuccessStep referenceId={createdReference} onTrack={handleTrackCurrent} />
      )}
    </div>
  );
}
