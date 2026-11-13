import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { buttonStyles } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <div className="relative overflow-hidden">
      <div className="ambient" />
      <div className="page-shell relative flex min-h-[60vh] flex-col items-center justify-center py-28 text-center">
        <p className="rise text-[7rem] font-semibold leading-none tracking-[-0.06em] text-white/10 sm:text-[10rem]">
          404
        </p>
        <h1
          data-testid="not-found-heading"
          className="rise -mt-6 text-3xl font-semibold tracking-[-0.03em] sm:-mt-10 sm:text-4xl"
          style={{ "--i": 1 } as React.CSSProperties}
        >
          Game or page not found
        </h1>
        <p
          className="rise mt-4 max-w-md text-base leading-relaxed text-muted"
          style={{ "--i": 2 } as React.CSSProperties}
        >
          That address is not in the OpenGameHub registry. It may have been renamed, or it failed build
          validation and was never published.
        </p>
        <Link
          href="/games"
          className={buttonStyles({ variant: "primary", size: "lg", className: "rise mt-9" })}
          style={{ "--i": 3 } as React.CSSProperties}
        >
          <ArrowLeft className="size-4" />
          Back to the library
        </Link>
      </div>
    </div>
  );
}
