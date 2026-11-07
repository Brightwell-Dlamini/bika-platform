import Link from 'next/link';

/**
 * Public placeholder while the full product is gated.
 * Reachable at /coming-soon; middleware can rewrite / → here.
 */
export default function ComingSoonPage() {
  return (
    <main className="relative min-h-screen flex flex-col overflow-hidden">
      {/* ambient */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -top-32 -right-24 w-[28rem] h-[28rem] rounded-full bg-yellow-500/[0.07] blur-3xl" />
        <div className="absolute bottom-0 -left-20 w-[22rem] h-[22rem] rounded-full bg-emerald-500/[0.05] blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_transparent_0%,_#05080f_70%)]" />
      </div>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="mb-8 w-16 h-16 rounded-2xl border border-yellow-500/30 bg-slate-950/80 p-2 shadow-[0_0_40px_rgba(234,179,8,0.15)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/Bika.png" alt="BIKA" className="w-full h-full object-contain" />
        </div>

        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-yellow-500/90 mb-3">
          Kingdom of Eswatini
        </p>
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white max-w-lg leading-[1.1]">
          Something essential is on the way
        </h1>
        <p className="mt-5 text-sm sm:text-base text-slate-400 max-w-md leading-relaxed">
          BIKA — the national incident and public-safety reporting platform — is in final
          preparation. Check back shortly.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
            Coming soon
          </span>
        </div>

        <div className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl w-full text-left">
          {[
            { t: 'Report', d: 'See something. Say something. Structured national intake.' },
            { t: 'Track', d: 'Reference IDs citizens can follow without an account.' },
            { t: 'Respond', d: 'Ops queue, command wall, and duty-aware assignment.' },
          ].map((item) => (
            <div
              key={item.t}
              className="rounded-2xl border border-white/[0.06] bg-[#0a0e16]/80 p-4"
            >
              <div className="text-xs font-black text-yellow-400 uppercase tracking-wider">
                {item.t}
              </div>
              <p className="mt-1.5 text-[12px] text-slate-500 leading-relaxed">{item.d}</p>
            </div>
          ))}
        </div>

        <p className="mt-12 text-[11px] text-slate-600">
          Officials:{' '}
          <Link href="/login" className="text-slate-400 hover:text-yellow-400 underline-offset-2 hover:underline">
            Sign in
          </Link>
        </p>
      </div>

      <footer className="relative z-10 pb-8 text-center text-[10px] text-slate-600 font-medium tracking-wide">
        BIKA · Eswatini
      </footer>
    </main>
  );
}
