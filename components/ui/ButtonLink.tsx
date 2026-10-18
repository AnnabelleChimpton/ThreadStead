import React from "react";
import Link from "next/link";

type Variant = "primary" | "secondary";
type Size = "sm" | "md" | "lg";

/**
 * Classes for a link styled as a button. `.btn` / `.btn--*` are the site
 * theme's hooks (they win when site CSS is loaded); the thread-palette
 * utilities are the fallback look without it. `.btn` sets display, so
 * icons inside should be inline (e.g. className="inline-block align-[-3px] mr-1.5").
 */
export function buttonClasses(variant: Variant = "primary", size: Size = "md"): string {
  const base = "btn inline-block no-underline font-semibold border-2 border-thread-sage rounded-md shadow-cozy-sm text-thread-pine";
  const look = variant === "primary" ? "btn--primary bg-thread-cream" : "btn--secondary bg-thread-paper";
  const scale = size === "lg" ? "btn--lg px-6 py-3 text-lg" : size === "sm" ? "px-3 py-1 text-sm" : "px-4 py-2";
  return `${base} ${look} ${scale}`;
}

interface ButtonLinkProps extends Omit<React.ComponentProps<typeof Link>, "className"> {
  variant?: Variant;
  size?: Size;
  className?: string;
}

export default function ButtonLink({ variant = "primary", size = "md", className = "", ...props }: ButtonLinkProps) {
  return <Link {...props} className={`${buttonClasses(variant, size)} ${className}`} />;
}
