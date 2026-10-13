'use client';

import { useMutation } from '@tanstack/react-query';
import { apiFetch, ApiError } from '@/app/lib/api/fetcher';
import { useInvalidateIncidents } from '@/app/lib/api/hooks/useIncidents';
import type { Incident } from '@/app/types';
import type { CitizenReportSubmission } from '@/app/lib/schemas';

interface SubmitReportResponse {
  incident: Incident;
}

export function useSubmitReport() {
  const invalidate = useInvalidateIncidents();

  return useMutation({
    mutationFn: async (input: CitizenReportSubmission) => {
      return apiFetch<SubmitReportResponse>('/api/reports', {
        method: 'POST',
        body: input,
      });
    },
    onSuccess: () => {
      invalidate();
    },
    onError: (error) => {
      // Map technical errors to human messages.
      if (error instanceof ApiError) {
        if (error.code === 'RATE_LIMITED') {
          throw new Error(
            'You have submitted several reports recently. Please wait a few minutes and try again.'
          );
        }
      }
      // Let the caller handle everything else.
    },
  });
}
