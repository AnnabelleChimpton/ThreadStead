import React from "react";

/** `titleId` lets a step move focus to the card (its heading takes focus but isn't in the tab order). */
export default function RetroCard({ title, titleId, children, className = "" }: { title?: string; titleId?: string; children: React.ReactNode; className?: string }) {
  return (
    <section aria-labelledby={titleId} className={`thread-module template-card ts-card p-0 sm:p-5 md:p-6 mb-3 sm:mb-4 md:mb-6${className ? ` ${className}` : ""}`}>
      {title && <h3 id={titleId} tabIndex={titleId ? -1 : undefined} className="thread-headline ts-card-title text-lg sm:text-xl font-bold mb-3 sm:mb-4 px-4 sm:px-0">{title}</h3>}
      {children}
    </section>
  );
}
