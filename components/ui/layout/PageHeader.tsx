import React from "react";
import Link from "next/link";

interface PageHeaderProps {
  title: React.ReactNode;
  /** One or more lede paragraphs under the title */
  children?: React.ReactNode;
  /** Optional "← Back to …" link shown above the card */
  back?: { href: string; label: string };
  /** Buttons or links shown beside the title (stacked under it on phones) */
  actions?: React.ReactNode;
  className?: string;
}

/**
 * The page title card for site pages (help, discover, build…): a notebook
 * card with a left-aligned headline. Replaces the per-page gradient heroes.
 */
export default function PageHeader({ title, children, back, actions, className = "" }: PageHeaderProps) {
  return (
    <header className={`mb-6 sm:mb-8 ${className}`}>
      {back && (
        <Link href={back.href} className="inline-block text-sm mb-3">
          ← {back.label}
        </Link>
      )}
      <div className="thread-module">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 sm:p-2">
          <div className="min-w-0 max-w-3xl">
            <h1 className="thread-headline text-3xl sm:text-4xl font-bold mb-2">{title}</h1>
            {children && <div className="space-y-2 text-base sm:text-lg text-nb-ink [&_p]:mb-0">{children}</div>}
          </div>
          {actions && <div className="flex flex-wrap gap-2 sm:flex-shrink-0">{actions}</div>}
        </div>
      </div>
    </header>
  );
}
