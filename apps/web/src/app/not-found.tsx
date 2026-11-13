import React from "react";
import Link from "next/link";
import { AlertOctagon, ArrowLeft } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="relative z-10 mx-auto flex max-w-xl flex-col items-center justify-center px-4 py-28 text-center">
      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-5 text-amber-400">
        <AlertOctagon className="h-8 w-8" />
      </div>
      <h1 data-testid="not-found-heading" className="text-3xl font-black text-white font-heading">
        Game or Page Not Found
      </h1>
      <p className="mt-3 text-sm text-slate-400 max-w-md">
        The requested game slug does not exist in the published OpenGameHub registry or failed build validation.
      </p>
      <Link
        href="/games"
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-xs font-semibold text-slate-950 hover:bg-slate-200 transition-colors shadow-sm"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Return to Game Library</span>
      </Link>
    </div>
  );
}
