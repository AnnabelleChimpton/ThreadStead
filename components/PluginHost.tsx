import React, { useEffect, useMemo, useState } from "react";
import type { InstalledPlugin, PluginContext, TabPluginModule } from "@/types/plugins";
import type { TabSpec } from "./Tabs";

/** Resolve plugins for a profile and expose as Tabs. */
export default function PluginHost({
  username,
  installed,
}: {
  username: string;
  installed: InstalledPlugin[];
}) {
  const [loaded, setLoaded] = useState<Array<{ id: string; label: string; node: React.ReactNode }>>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ctx: PluginContext = { username };
      const results: Array<{ id: string; label: string; node: React.ReactNode }> = [];

      for (const p of installed) {
        try {
          if (p.trusted && p.load) {
            const mod: TabPluginModule = await p.load();
            const label = mod.manifest.name || p.id;
            const id = p.initialTabId || mod.manifest.id;
            const node = mod.default(ctx);
            results.push({ id, label, node });
          } else if (p.iframeUrl) {
            const id = p.initialTabId || p.id;
            const label = p.manifest?.name || p.id;
            // Simple sandboxed iframe (can evolve to postMessage API)
            results.push({
              id,
              label,
              node: (
                <iframe
                  title={label}
                  src={`${p.iframeUrl}?username=${encodeURIComponent(username)}`}
                  className="w-full h-[60vh] border-0"
                  sandbox="allow-same-origin allow-scripts"
                />
              ),
            });
          }
        } catch (e) {
          console.error("Plugin load failed:", p.id, e);
        }
      }

      if (!cancelled) setLoaded(results);
    })();
    return () => { cancelled = true; };
  }, [installed, username]);

  // Expose as TabSpec[] for Tabs
  const tabs: TabSpec[] = useMemo(
    () => loaded.map(({ id, label, node }) => ({ id, label, content: node })),
    [loaded]
  );

  return <>{tabs.length ? <div data-plugin-tabs /> : null}</>;
}

// Helper to merge tabs elsewhere
export function mergeTabs(base: TabSpec[], pluginTabs: TabSpec[]): TabSpec[] {
  // Prevent collisions (append numeric suffix)
  const ids = new Set(base.map(t => t.id));
  const safe = pluginTabs.map(t => {
    let i = 1;
    let id = t.id;
    while (ids.has(id)) id = `${t.id}-${i++}`;
    ids.add(id);
    return { ...t, id };
  });
  return [...base, ...safe];
}
