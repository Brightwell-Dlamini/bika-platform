import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-4 shadow-2xl">
        <p className="text-[10px] font-black uppercase tracking-widest text-yellow-400">404</p>
        <h1 className="text-2xl font-black text-white">Page not found</h1>
        <p className="text-sm text-slate-400 leading-relaxed">
          This link does not match any BIKA page. Return to the public portal or official sign-in.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
          <Link
            href="/report"
            className="px-5 py-3 rounded-xl bg-yellow-500 text-slate-950 text-xs font-black"
          >
            Public portal
          </Link>
          <Link
            href="/login"
            className="px-5 py-3 rounded-xl bg-slate-800 text-slate-200 text-xs font-bold border border-slate-700"
          >
            Official sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
