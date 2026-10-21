import React, { useEffect, useMemo, useRef, useState } from "react";

export type TabSpec = { id: string; label: React.ReactNode; content: React.ReactNode };
type TabsProps = {
  tabs: TabSpec[];
  initialId?: string;   // from server
  syncWithUrl?: boolean;
  /**
   * "profile" (default): the profile-tab-* classes user templates restyle.
   * "site": a notebook tab strip for site pages (feed, settings) that opts
   * out of the site-wide button bevel. Never use "site" on profile pages —
   * its unlayered .ts-tab rules would override users' template CSS.
   */
  variant?: "profile" | "site";
  /**
   * "site" only. On phones the tabs sit in one row that scrolls sideways
   * instead of wrapping, and the frame around the panel goes away (the page
   * card already frames it).
   */
  compactOnPhone?: boolean;
};

export default function Tabs({ tabs, initialId, syncWithUrl = true, variant = "profile", compactOnPhone = false }: TabsProps) {
  const firstId = tabs[0]?.id;
  // Initial state comes from server-provided initialId or first tab.
  const [active, setActive] = useState(initialId || firstId);

  // If tabs list changes and current id disappears, fall back safely.
  useEffect(() => {
    if (!tabs.find(t => t.id === active)) setActive(firstId);
  }, [tabs, active, firstId]);

  // Optional URL sync on the client *after* first paint (won't affect SSR HTML)
  const [initialActive] = useState(active);
  useEffect(() => {
    if (!syncWithUrl) return;
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (active) params.set("tab", active); else params.delete("tab");
    // Keep the #fragment on the tab the page opened on (a guestbook
    // notification links to one entry); switching tabs drops it.
    const hash = active === initialActive ? window.location.hash : "";
    const url = `${window.location.pathname}?${params.toString()}${hash}`;
    window.history.replaceState({}, "", url);
  }, [active, initialActive, syncWithUrl]);

  // Keep the open tab in view when the row scrolls sideways
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const list = listRef.current;
    if (!compactOnPhone || !list || list.scrollWidth <= list.clientWidth) return;
    const tab = list.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!tab) return;
    const left = tab.offsetLeft - list.offsetLeft;
    if (left < list.scrollLeft || left + tab.offsetWidth > list.scrollLeft + list.clientWidth) {
      list.scrollLeft = left - 16;
    }
  }, [active, compactOnPhone]);

  const activeContent = useMemo(
    () => tabs.find(t => t.id === active)?.content,
    [tabs, active]
  );

  if (variant === "site") {
    return (
      <div className={compactOnPhone ? "thread-module ts-phone-bare" : "thread-module"}>
        <div
          ref={listRef}
          role="tablist"
          className={`flex border-b-2 border-dotted border-nb-ink-mid/40 mb-4 ${compactOnPhone ? "ts-tab-row flex-nowrap overflow-x-auto sm:flex-wrap sm:overflow-visible" : "flex-wrap"}`}
        >
          {tabs.map(t => {
            const selected = t.id === active;
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={selected}
                aria-controls={`panel-${t.id}`}
                id={`tab-${t.id}`}
                onClick={() => setActive(t.id)}
                className="ts-tab whitespace-nowrap text-sm sm:text-base [&_svg]:inline-block [&_svg]:align-[-3px] [&_svg]:mr-1"
              >
                {t.label}
              </button>
            );
          })}
        </div>
        <div role="tabpanel" id={`panel-${active}`} aria-labelledby={`tab-${active}`}>
          {activeContent}
        </div>
      </div>
    );
  }

  return (
    <div className="profile-tabs thread-module p-0 overflow-hidden">
      <div role="tablist" aria-label="Profile sections" className="profile-tab-list flex md:flex-wrap border-b border-thread-sage/30 overflow-x-auto">
        {tabs.map(t => {
          const selected = t.id === active;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={selected}
              aria-controls={`panel-${t.id}`}
              id={`tab-${t.id}`}
              onClick={() => setActive(t.id)}
              className={
                "profile-tab-button px-3 sm:px-4 py-3 text-sm sm:text-base border-r border-thread-sage/20 focus:outline-none transition-all min-w-fit min-h-[48px] " +
                (selected
                  ? "active bg-thread-cream font-medium text-thread-pine"
                  : "bg-thread-paper hover:bg-thread-cream/50 text-thread-sage hover:text-thread-pine")
              }
            >
              {t.label}
            </button>
          );
        })}
      </div>
      <div
        role="tabpanel"
        id={`panel-${active}`}
        aria-labelledby={`tab-${active}`}
        className="profile-tab-panel p-0 sm:p-5 md:p-6"
      >
        {activeContent}
      </div>
    </div>
  );
}
