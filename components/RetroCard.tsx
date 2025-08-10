import React from "react";

export default function RetroCard({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="bg-retro.box border border-retro-border shadow-retro p-3 mb-4">
      {title && <h3 className="font-bold mb-2">{title}</h3>}
      {children}
    </section>
  );
}
