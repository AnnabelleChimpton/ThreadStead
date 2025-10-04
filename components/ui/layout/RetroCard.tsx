import React from "react";

export default function RetroCard({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="thread-module template-card p-4 sm:p-5 md:p-6 mb-3 sm:mb-4 md:mb-6">
      {title && <h3 className="thread-headline text-lg sm:text-xl font-bold mb-3 sm:mb-4">{title}</h3>}
      {children}
    </section>
  );
}
