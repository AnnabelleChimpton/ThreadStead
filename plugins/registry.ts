import type { TabPluginModule } from "@/types/plugins";

/**
 * Client-side registry mapping plugin IDs → dynamic imports.
 * Keep import paths static so bundlers can split/codegen properly.
 */
export const pluginRegistry: Record<string, () => Promise<TabPluginModule>> = {
  "com.example.hello": () =>
    import("@/plugins/hello-world").then((m) => m.default),
};
