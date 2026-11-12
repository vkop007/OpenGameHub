import React from "react";
import Link from "next/link";
import { AlertOctagon, ArrowLeft } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center justify-center px-4 py-28 text-center">
      <AlertOctagon className="mb-4 h-12 w-12 text-[#c7f36b]" />
      <h1 data-testid="not-found-heading" className="text-3xl font-black text-[#f4f1ea]">
        Game or Page Not Found
      </h1>
      <p className="mt-2 text-sm text-[#a2a5ad]">
        The requested game slug does not exist in the published OpenGameHub registry or failed build validation.
      </p>
      <Link
        href="/games"
        className="mt-6 inline-flex items-center gap-2 rounded-sm bg-[#c7f36b] px-5 py-2.5 text-xs font-bold text-[#0b0c0f] hover:bg-[#f4f1ea]"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Return to Game Library</span>
      </Link>
    </div>
  );
}
