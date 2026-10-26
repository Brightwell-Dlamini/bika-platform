import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/app/lib/logger';

const BUCKET = 'incident-attachments';

interface AttachmentLike {
  id?: string;
  url?: string;
  name?: string;
  type?: string;
  mimeType?: string;
  sizeBytes?: number;
  caption?: string | null;
  [key: string]: unknown;
}

/**
 * Move citizen uploads from unassigned/ into incidents/{incidentId}/ and
 * rewrite public URLs. Failures are logged; original attachment is kept.
 */
export async function rehomeAttachments(
  supabase: SupabaseClient,
  incidentId: string,
  attachments: AttachmentLike[] | null | undefined
): Promise<AttachmentLike[]> {
  if (!attachments || attachments.length === 0) return attachments ?? [];

  const next: AttachmentLike[] = [];

  for (const att of attachments) {
    const url = typeof att.url === 'string' ? att.url : '';
    if (!url) {
      next.push(att);
      continue;
    }

    const path = extractStoragePath(url);
    if (!path || !path.startsWith('unassigned/')) {
      next.push(att);
      continue;
    }

    const filename = path.split('/').pop() || `${att.id || 'file'}.jpg`;
    const newPath = `incidents/${incidentId}/${filename}`;

    try {
      const { error: moveErr } = await supabase.storage.from(BUCKET).move(path, newPath);
      if (moveErr) {
        logger.warn('attachment_rehome_failed', {
          incidentId,
          path,
          error: moveErr.message,
        });
        next.push(att);
        continue;
      }

      const { data } = supabase.storage.from(BUCKET).getPublicUrl(newPath);
      next.push({
        ...att,
        url: data.publicUrl,
      });
    } catch (err) {
      logger.warn('attachment_rehome_threw', {
        incidentId,
        path,
        error: err instanceof Error ? err.message : String(err),
      });
      next.push(att);
    }
  }

  return next;
}

function extractStoragePath(publicUrl: string): string | null {
  try {
    // .../object/public/incident-attachments/<path>
    const marker = `/object/public/${BUCKET}/`;
    const idx = publicUrl.indexOf(marker);
    if (idx === -1) {
      // Fallback: bucket name then path
      const alt = publicUrl.split(`${BUCKET}/`);
      if (alt.length < 2) return null;
      return decodeURIComponent(alt[1]!.split('?')[0]!);
    }
    return decodeURIComponent(publicUrl.slice(idx + marker.length).split('?')[0]!);
  } catch {
    return null;
  }
}
