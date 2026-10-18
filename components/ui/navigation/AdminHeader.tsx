import React from "react";
import Link from "next/link";
import { ADMIN_PAGES, AdminPageKey } from "./siteNav";

interface AdminHeaderProps {
  current: AdminPageKey;
  /** One line under the title about this page */
  children?: React.ReactNode;
}

// Title and tabs shared by every /admin page, so each is one click from the others.
export default function AdminHeader({ current, children }: AdminHeaderProps) {
  const page = ADMIN_PAGES.find((p) => p.key === current);
  return (
    <header className="thread-module mb-6">
      <p className="thread-label mb-1">Admin</p>
      <h1 className="thread-headline text-2xl sm:text-3xl font-bold mb-2">{page?.title}</h1>
      {children && <div className="text-nb-ink-mid mb-3 [&_p]:mb-0">{children}</div>}
      <nav aria-label="Admin" className="flex flex-wrap gap-x-1 border-b border-nb-ink-mid/30 -mb-2">
        {ADMIN_PAGES.map((p) => (
          <Link
            key={p.key}
            href={p.href}
            className="ts-tab no-underline"
            aria-current={p.key === current ? "page" : undefined}
          >
            {p.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
