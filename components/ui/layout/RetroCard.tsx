import React from "react";

export default function RetroCard({ title, children, className = "" }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`thread-module template-card ts-card p-0 sm:p-5 md:p-6 mb-3 sm:mb-4 md:mb-6${className ? ` ${className}` : ""}`}>
      {title && <h3 className="thread-headline ts-card-title text-lg sm:text-xl font-bold mb-3 sm:mb-4 px-4 sm:px-0">{title}</h3>}
      {children}
    </section>
  );
}
