import type { ReactNode } from "react";

export type PluginManifest = {
  id: string;
  name: string;
  version: string;
  author?: string;
  description?: string;
  /** Where this plugin can render. Start with profile tabs. */
  slots: ReadonlyArray<"profile:tab">;
  trusted?: boolean;
  permissions?: Array<"read:profile" | "read:posts" | "write:guestbook">;
};

export type PluginContext = {
  username: string;
};

/** What a plugin module exports at runtime */
export type TabPluginModule = {
  default: (props: PluginContext) => ReactNode;
  manifest: PluginManifest & { slots: Readonly<["profile:tab"]> };
};

/** ✅ JSON-serializable descriptor returned by getServerSideProps */
export type PluginDescriptor = {
  id: string;                  // e.g. "com.example.hello"
  mode: "trusted" | "iframe";  // how to load on the client
  label?: string;              // optional UI label override
  iframeUrl?: string;          // for iframe mode
};

/** Runtime shape built on the client (can include functions) */
export type InstalledPlugin = PluginDescriptor & {
  load?: () => Promise<TabPluginModule>; // only for trusted mode
};
