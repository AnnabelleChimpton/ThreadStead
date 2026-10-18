import React from "react";
import Link from "next/link";

export type ButtonVariant = "primary" | "secondary" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

/**
 * Classes for anything styled as a button. `.btn` / `.btn--*` are the site
 * theme's hooks (they win when site CSS is loaded); the thread-palette
 * utilities are the fallback look without it. `.btn` sets display on links,
 * so icons inside should be inline (e.g. className="inline-block align-[-3px] mr-1.5").
 *
 * Pass `{ inline: false }` for a real <button>: it is inline-block already,
 * and callers often make it flex, which an `inline-block` utility would fight.
 */
export function buttonClasses(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  { inline = true }: { inline?: boolean } = {},
): string {
  const base = "btn no-underline font-semibold border-2 border-thread-sage rounded-md shadow-cozy-sm text-thread-pine";
  const look =
    variant === "secondary" ? "btn--secondary bg-thread-paper"
    : variant === "danger" ? "btn--primary ts-btn-danger bg-thread-cream"
    : "btn--primary bg-thread-cream";
  const scale = size === "lg" ? "btn--lg px-6 py-3 text-lg" : size === "sm" ? "px-3 py-1 text-sm" : "px-4 py-2";
  return `${inline ? "inline-block " : ""}${base} ${look} ${scale}`;
}

interface ButtonLinkProps extends Omit<React.ComponentProps<typeof Link>, "className"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}

export default function ButtonLink({ variant = "primary", size = "md", className = "", ...props }: ButtonLinkProps) {
  return <Link {...props} className={`${buttonClasses(variant, size)} ${className}`} />;
}
