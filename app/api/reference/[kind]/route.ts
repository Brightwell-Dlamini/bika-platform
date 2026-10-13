import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabase } from '@/app/lib/supabase/server';
import type { ApiResponse, Agency, Hotline } from '@/app/types';

export const dynamic = 'force-dynamic';

const KINDS = ['agencies', 'hotlines', 'logos', 'config'] as const;
type Kind = (typeof KINDS)[number];

function isKind(s: string): s is Kind {
  return (KINDS as readonly string[]).includes(s);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ kind: string }> }
) {
  const { kind } = await params;

  if (!isKind(kind)) {
    const body: ApiResponse<never> = {
      ok: false,
      code: 'NOT_FOUND',
      error: `Unknown reference kind: ${kind}`,
    };
    return NextResponse.json(body, { status: 404 });
  }

  const supabase = createServiceSupabase();

  switch (kind) {
    case 'agencies': {
      const { data, error } = await supabase
        .from('agencies')
        .select('*')
        .eq('active', true)
        .order('code');
      if (error) return err(error.message);
      const agencies: Agency[] = (data ?? []).map((r) => ({
        code: r.code,
        name: r.name,
        shortName: r.short_name,
        region: r.region,
        contactPhone: r.contact_phone,
        contactEmail: r.contact_email,
        active: r.active,
      }));
      return NextResponse.json({ ok: true, data: { agencies } });
    }
    case 'hotlines': {
      const { data, error } = await supabase
        .from('hotlines')
        .select('*')
        .eq('active', true)
        .order('priority');
      if (error) return err(error.message);
      const hotlines: Hotline[] = (data ?? []).map((r) => ({
        id: r.id,
        name: r.name,
        number: r.number,
        category: r.category,
        description: r.description,
        agencyCode: r.agency_code,
        availableHours: r.available_hours,
        isTollFree: r.is_toll_free,
        priority: r.priority,
        active: r.active,
      }));
      return NextResponse.json({ ok: true, data: { hotlines } });
    }
    case 'logos': {
      const { data, error } = await supabase.from('system_logos').select('*');
      if (error) return err(error.message);
      const logos = (data ?? []).map((r) => ({
        id: r.id,
        name: r.name,
        subtitle: r.subtitle,
        acronym: r.acronym,
        role: r.role,
        customImageUrl: r.custom_image_url,
        badgeColor: r.badge_color,
        updatedAt: r.updated_at,
      }));
      return NextResponse.json({ ok: true, data: { logos } });
    }
    case 'config': {
      const { data, error } = await supabase
        .from('system_config')
        .select('app_name, sub_title, max_image_size_bytes, allowed_image_formats')
        .eq('id', 'default')
        .maybeSingle();
      if (error) return err(error.message);
      return NextResponse.json({
        ok: true,
        data: {
          appName: data?.app_name ?? 'BIKA',
          subTitle: data?.sub_title ?? '',
          maxImageSizeBytes: data?.max_image_size_bytes ?? 1048576,
          allowedImageFormats: data?.allowed_image_formats ?? [
            'image/jpeg',
            'image/png',
            'image/webp',
          ],
        },
      });
    }
  }
}

function err(message: string) {
  const body: ApiResponse<never> = { ok: false, code: 'DB_ERROR', error: message };
  return NextResponse.json(body, { status: 500 });
}
