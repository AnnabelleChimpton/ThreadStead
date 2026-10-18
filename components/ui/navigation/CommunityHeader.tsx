import React from "react";
import Link from "next/link";
import PageHeader from "@/components/ui/layout/PageHeader";
import { COMMUNITY_TABS, CommunityTabKey } from "./siteNav";

interface CommunityHeaderProps {
  current: CommunityTabKey;
  /** Buttons beside the title, e.g. "Post a note" */
  actions?: React.ReactNode;
}

// The Community title card with its tabs. Each tab is its own page, so the
// tabs are links and the current one carries aria-current.
export default function CommunityHeader({ current, actions }: CommunityHeaderProps) {
  return (
    <PageHeader title="Community" actions={actions} className="mb-4 sm:mb-6">
      <nav aria-label="Community" className="flex flex-wrap gap-x-1 -mb-2 border-b border-nb-ink-mid/30">
        {COMMUNITY_TABS.map((tab) => (
          <Link
            key={tab.key}
            href={tab.href}
            className="ts-tab no-underline"
            aria-current={tab.key === current ? "page" : undefined}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
    </PageHeader>
  );
}
