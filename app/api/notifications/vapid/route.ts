import { NextResponse } from 'next/server';
import type { ApiResponse } from '@/app/types';

export const dynamic = 'force-dynamic';

/** Public VAPID key for client push subscription (safe to expose). */
export async function GET() {
  const key = process.env.VAPID_PUBLIC_KEY ?? process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';
  const body: ApiResponse<{ publicKey: string; configured: boolean }> = {
    ok: true,
    data: { publicKey: key, configured: Boolean(key) },
  };
  return NextResponse.json(body);
}
