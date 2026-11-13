"use client";

import React, { useState } from "react";
import { Check, Copy } from "lucide-react";
import { buttonStyles } from "@/components/ui/button";

export function CopyPromptBlock({ title, content }: { title: string; content: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
    } catch {
      // Clipboard can be blocked (insecure context); still show feedback so the UI never feels dead
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-canvas shadow-pop">
      <div className="flex items-center justify-between gap-4 border-b border-line py-2.5 pl-4 pr-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="size-2.5 rounded-full bg-white/15" />
          <span className="size-2.5 rounded-full bg-white/15" />
          <span className="size-2.5 rounded-full bg-white/15" />
          <span className="ml-3 truncate font-mono text-xs text-subtle">{title}</span>
        </div>
        <button
          type="button"
          data-testid="copy-prompt-button"
          onClick={handleCopy}
          className={buttonStyles({
            variant: copied ? "primary" : "secondary",
            size: "sm",
            className: "shrink-0"
          })}
        >
          {copied ? (
            <>
              <Check className="size-3.5" strokeWidth={3} />
              Copied
            </>
          ) : (
            <>
              <Copy className="size-3.5" />
              Copy prompt
            </>
          )}
        </button>
      </div>
      <pre
        data-testid="ai-migration-prompt-content"
        tabIndex={0}
        className="max-h-[28rem] overflow-auto whitespace-pre-wrap p-5 font-mono text-[13px] leading-relaxed text-muted sm:p-6"
      >
        {content}
      </pre>
    </div>
  );
}
