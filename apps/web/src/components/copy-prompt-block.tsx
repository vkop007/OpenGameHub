"use client";

import React, { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyPromptBlock({
  title,
  content
}: {
  title: string;
  content: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="overflow-hidden rounded-xl bg-white/[0.03] ring-1 ring-white/[0.07]">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2.5">
        <span className="font-mono text-xs text-zinc-400">{title}</span>
        <button
          type="button"
          data-testid="copy-prompt-button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold text-zinc-950 transition hover:bg-zinc-200"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-600" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span>Copy Prompt</span>
            </>
          )}
        </button>
      </div>
      <pre
        data-testid="ai-migration-prompt-content"
        className="max-h-[440px] overflow-auto p-5 text-xs leading-relaxed text-zinc-300 font-mono whitespace-pre-wrap"
      >
        {content}
      </pre>
    </div>
  );
}
