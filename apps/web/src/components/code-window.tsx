import React from "react";
import { cn } from "@/lib/utils";

/** A quiet code container with a title bar. Content is passed as children of the <pre>. */
export function CodeWindow({
  title,
  children,
  className,
  preClassName
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  preClassName?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-2xl border border-line bg-canvas", className)}>
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <span className="size-2.5 rounded-full bg-white/15" />
        <span className="size-2.5 rounded-full bg-white/15" />
        <span className="size-2.5 rounded-full bg-white/15" />
        <span className="ml-3 truncate font-mono text-xs text-subtle">{title}</span>
      </div>
      <pre
        className={cn(
          "overflow-auto p-5 font-mono text-[13px] leading-7 text-muted sm:p-6",
          preClassName
        )}
      >
        {children}
      </pre>
    </div>
  );
}
