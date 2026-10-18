import React from "react";

interface CalloutProps {
  title?: React.ReactNode;
  children: React.ReactNode;
  /** "note" (default): dotted paper aside. "framed": solid notebook frame for a call to action. */
  variant?: "note" | "framed";
  className?: string;
}

/**
 * One aside style for tips, "what is X?" boxes and small calls to action,
 * in place of the per-page blue/green/purple tinted boxes.
 */
export default function Callout({ title, children, variant = "note", className = "" }: CalloutProps) {
  const frame =
    variant === "framed"
      ? "bg-nb-paper border-2 border-nb-ink-mid rounded-cozy shadow-nb-sm"
      : "border-2 border-dotted border-nb-ink-mid/60 rounded-md";
  return (
    <div className={`${frame} p-4 sm:p-5 text-nb-ink ${className}`}>
      {title && <p className="font-bold text-nb-ink mb-2">{title}</p>}
      <div className="text-sm sm:text-base [&_p]:mb-2 [&_p:last-child]:mb-0">{children}</div>
    </div>
  );
}
