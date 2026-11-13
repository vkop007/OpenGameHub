import React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function Breadcrumbs({ trail }: { trail: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[13px] text-subtle">
      {trail.map((item, i) => (
        <React.Fragment key={item.label}>
          {i > 0 && <ChevronRight className="size-3.5 text-subtle/60" />}
          {item.href ? (
            <Link href={item.href} className="transition-colors hover:text-fg">
              {item.label}
            </Link>
          ) : (
            <span aria-current="page" className="text-muted">
              {item.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}

/** Small label above a heading. Sentence case, no shouting. */
export function Eyebrow({
  children,
  icon
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-2 text-[13px] font-medium text-accent">
      {icon}
      {children}
    </span>
  );
}

export function PageHeader({
  breadcrumbs,
  eyebrow,
  eyebrowIcon,
  title,
  titleTestId,
  description,
  aside
}: {
  breadcrumbs: { label: string; href?: string }[];
  eyebrow: string;
  eyebrowIcon?: React.ReactNode;
  title: React.ReactNode;
  titleTestId: string;
  description: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <header className="relative overflow-hidden border-b border-line">
      <div className="ambient" />
      <div className="dot-grid opacity-60" />
      <div className="page-shell relative pb-10 pt-6 sm:pb-12">
        <div className="rise" style={{ "--i": 0 } as React.CSSProperties}>
          <Breadcrumbs trail={breadcrumbs} />
        </div>
        <div className="mt-8 flex flex-wrap items-end justify-between gap-8">
          <div className="max-w-2xl space-y-5">
            <div className="rise" style={{ "--i": 1 } as React.CSSProperties}>
              <Eyebrow icon={eyebrowIcon}>{eyebrow}</Eyebrow>
            </div>
            <h1
              data-testid={titleTestId}
              className="rise text-4xl font-semibold leading-[1.05] tracking-[-0.035em] sm:text-5xl lg:text-6xl"
              style={{ "--i": 2 } as React.CSSProperties}
            >
              {title}
            </h1>
            <p
              className="rise max-w-xl text-base leading-relaxed text-muted sm:text-lg"
              style={{ "--i": 3 } as React.CSSProperties}
            >
              {description}
            </p>
          </div>
          {aside && (
            <div className="rise" style={{ "--i": 4 } as React.CSSProperties}>
              {aside}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export function SectionHeading({
  title,
  description,
  action,
  id
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  id?: string;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-xl space-y-2">
        <h2 id={id} className="text-2xl font-semibold tracking-[-0.025em] sm:text-3xl">
          {title}
        </h2>
        {description && <p className="text-[15px] leading-relaxed text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
