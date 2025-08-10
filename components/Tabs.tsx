import React, { useEffect, useMemo, useState } from "react";

export type TabSpec = {
  id: string;
  label: string;
  content: React.ReactNode;
};

type TabsProps = {
  tabs: TabSpec[];
  initialId?: string;            // optional (defaults to first tab)
  syncWithUrl?: boolean;         // if true, uses ?tab= in the URL
};

export default function Tabs({ tabs, initialId, syncWithUrl = true }: TabsProps) {
  const firstId = tabs[0]?.id;
  const startId = initialId || (syncWithUrl ? (new URLSearchParams(typeof window !== "undefined" ? window.location.search : "").get("tab") || firstId) : firstId);
  const [active, setActive] = useState(startId);

  // keep URL in sync (optional)
  useEffect(() => {
    if (!syncWithUrl) return;
    const params = new URLSearchParams(window.location.search);
    params.set("tab", active);
    const url = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, "", url);
  }, [active, syncWithUrl]);

  // guard if active id disappears
  useEffect(() => {
    if (!tabs.find(t => t.id === active)) setActive(firstId);
  }, [tabs, active, firstId]);

  const activeContent = useMemo(() => tabs.find(t => t.id === active)?.content, [tabs, active]);

  return (
    <div className="bg-white border border-black shadow-[4px_4px_0_#000]">
      {/* Tab list */}
      <div role="tablist" aria-label="Profile sections" className="flex flex-wrap border-b border-black">
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
                "px-3 py-2 border-r border-black focus:outline-none " +
                (selected ? "bg-yellow-200 font-semibold" : "bg-white hover:bg-yellow-100")
              }
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Panel */}
      <div
        role="tabpanel"
        id={`panel-${active}`}
        aria-labelledby={`tab-${active}`}
        className="p-3"
      >
        {activeContent}
      </div>
    </div>
  );
}
