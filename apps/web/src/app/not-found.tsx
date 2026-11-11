import React from "react";
import Link from "next/link";
import { AlertOctagon, ArrowLeft } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center justify-center px-4 py-24 text-center">
      <AlertOctagon className="h-12 w-12 text-amber-400 mb-4" />
      <h1 data-testid="not-found-heading" className="text-2xl font-extrabold text-white">
        Game or Page Not Found
      </h1>
      <p className="mt-2 text-sm text-zinc-400">
        The requested game slug does not exist in the published OpenGameHub registry or failed build validation.
      </p>
      <Link
        href="/games"
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Return to Game Library</span>
      </Link>
    </div>
  );
}
