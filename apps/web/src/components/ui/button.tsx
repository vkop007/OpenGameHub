import React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium select-none " +
  "transition-[background-color,border-color,color,transform,box-shadow] duration-200 " +
  "active:translate-y-px disabled:pointer-events-none disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary:
    "bg-gradient-to-b from-accent-strong to-accent text-accent-ink hover:from-[#ffd070] hover:to-accent-strong shadow-[inset_0_1px_0_rgb(255_255_255/0.45),0_0_0_1px_rgb(255_180_41/0.5),0_10px_28px_-10px_rgb(255_180_41/0.55)]",
  secondary:
    "bg-raised text-fg border border-line-strong hover:border-white/25 hover:bg-white/[0.07]",
  ghost: "text-muted hover:text-fg hover:bg-white/[0.06]"
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] rounded-lg",
  md: "h-10 px-4 text-sm rounded-xl",
  lg: "h-12 px-6 text-[15px] rounded-xl"
};

/** Class string for anything that should look like a button (links included). */
export function buttonStyles({
  variant = "primary",
  size = "md",
  className
}: {
  variant?: Variant;
  size?: Size;
  className?: string;
} = {}): string {
  return cn(base, variants[variant], sizes[size], className);
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({ className, variant, size, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonStyles({ variant, size, className })} {...props} />;
}
