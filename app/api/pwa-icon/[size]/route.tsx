import { ImageResponse } from 'next/og';
import { readFile } from 'fs/promises';
import { join } from 'path';

export const runtime = 'nodejs';

const ALLOWED = new Set([180, 192, 256, 512]);

/**
 * Real PNG icons for PWA installability.
 * Replaces corrupt base64-text files that were stored under public/icons/.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ size: string }> }
) {
  const { size: sizeRaw } = await context.params;
  const size = Number(sizeRaw);
  if (!ALLOWED.has(size)) {
    return new Response('Unsupported size', { status: 400 });
  }

  const url = new URL(request.url);
  const purpose = url.searchParams.get('purpose') || 'any';
  // Maskable icons need ~20% safe zone; "any" can use tighter padding.
  const padRatio = purpose === 'maskable' ? 0.22 : 0.1;
  const logoBox = Math.round(size * (1 - padRatio * 2));

  let logoSrc = '';
  try {
    const logoData = await readFile(join(process.cwd(), 'public', 'Bika.png'));
    logoSrc = `data:image/png;base64,${logoData.toString('base64')}`;
  } catch {
    // Fallback: yellow mark if logo missing
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#020617',
        }}
      >
        {logoSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoSrc}
            width={logoBox}
            height={logoBox}
            style={{ objectFit: 'contain' }}
            alt=""
          />
        ) : (
          <div
            style={{
              width: logoBox * 0.55,
              height: logoBox * 0.55,
              borderRadius: logoBox * 0.12,
              background: '#eab308',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#020617',
              fontSize: Math.round(logoBox * 0.22),
              fontWeight: 900,
              fontFamily: 'system-ui, sans-serif',
            }}
          >
            B
          </div>
        )}
      </div>
    ),
    {
      width: size,
      height: size,
      headers: {
        'Cache-Control': 'public, max-age=86400, immutable',
      },
    }
  );
}
