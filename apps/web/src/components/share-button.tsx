"use client";

import React, { useState } from "react";
import { Check, Share2 } from "lucide-react";
import { buttonStyles } from "@/components/ui/button";

export function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (typeof navigator.share === "function" && window.matchMedia("(pointer: coarse)").matches) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Share sheet dismissed or clipboard blocked. Nothing to recover.
    }
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      className={buttonStyles({ variant: "secondary", size: "sm" })}
    >
      {copied ? (
        <>
          <Check className="size-3.5 text-accent" strokeWidth={3} />
          Link copied
        </>
      ) : (
        <>
          <Share2 className="size-3.5 text-muted" />
          Share
        </>
      )}
    </button>
  );
}
