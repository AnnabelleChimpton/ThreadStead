import React, { useEffect, useMemo, useState } from "react";

export type TabSpec = { id: string; label: string; content: React.ReactNode };
type TabsProps = {
  tabs: TabSpec[];
  initialId?: string;   // from server
  syncWithUrl?: boolean;
};

export default function Tabs({ tabs, initialId, syncWithUrl = true }: TabsProps) {
  const firstId = tabs[0]?.id;
  // Initial state comes from server-provided initialId or first tab.
  const [active, setActive] = useState(initialId || firstId);

  // If tabs list changes and current id disappears, fall back safely.
  useEffect(() => {
    if (!tabs.find(t => t.id === active)) setActive(firstId);
  }, [tabs, active, firstId]);

  // Optional URL sync on the client *after* first paint (won't affect SSR HTML)
  useEffect(() => {
    if (!syncWithUrl) return;
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (active) params.set("tab", active); else params.delete("tab");
    const url = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, "", url);
  }, [active, syncWithUrl]);

  const activeContent = useMemo(
    () => tabs.find(t => t.id === active)?.content,
    [tabs, active]
  );

  return (
    <div className="profile-tabs thread-module p-0 overflow-hidden">
      <div role="tablist" aria-label="Profile sections" className="profile-tab-list flex flex-wrap border-b border-thread-sage/30">
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
                "profile-tab-button px-4 py-3 border-r border-thread-sage/20 focus:outline-none transition-all " +
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
        className="profile-tab-panel p-6"
      >
        {activeContent}
      </div>
    </div>
  );
}
