import React from "react";

export default function RetroCard({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="thread-module p-6 mb-6">
      {title && <h3 className="thread-headline text-xl font-bold mb-4">{title}</h3>}
      {children}
    </section>
  );
}
