import type { TabPluginModule } from "@/types/plugins";

/** Map plugin IDs to loader functions. Keep trusted plugins here. */
export const pluginRegistry: Record<string, () => Promise<TabPluginModule>> = {
  "com.example.hello": () =>
    import("@/plugins/hello-world").then((m) => m.default),
  // Add more: "com.your.cool": () => import("@/plugins/cool").then(m => m.default),
};
