import React from "react";
type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean };

export default function RetroButton({ loading, children, className = "", ...rest }: Props) {
  return (
    <button
      className={
        "border border-retro-border bg-retro.sun px-3 py-1 shadow-retroSm active:translate-x-[1px] active:translate-y-[1px] " +
        "hover:brightness-95 focus-visible:outline-none " + className
      }
      {...rest}
      aria-busy={loading || undefined}
    >
      {loading ? "Working..." : children}
    </button>
  );
}
