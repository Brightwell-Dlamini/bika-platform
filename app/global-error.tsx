'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#020617', color: '#f8fafc', fontFamily: 'system-ui' }}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ maxWidth: 420, textAlign: 'center' }}>
            <h1 style={{ fontSize: 22, fontWeight: 900 }}>BIKA — critical error</h1>
            <p style={{ color: '#94a3b8', fontSize: 14 }}>The application shell failed. Please reload.</p>
            {error.digest && (
              <p style={{ fontSize: 10, color: '#64748b', fontFamily: 'monospace' }}>Ref: {error.digest}</p>
            )}
            <button
              type="button"
              onClick={reset}
              style={{
                marginTop: 16,
                background: '#eab308',
                color: '#020617',
                border: 'none',
                borderRadius: 12,
                padding: '12px 20px',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              Reload
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
