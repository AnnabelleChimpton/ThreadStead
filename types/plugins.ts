import type { ReactNode } from "react";

export type PluginManifest = {
  id: string;
  name: string;
  version: string;
  author?: string;
  description?: string;
  slots: ReadonlyArray<"profile:tab">;
  trusted?: boolean;
  permissions?: Array<"read:profile" | "read:posts" | "write:guestbook">;
};

export type PluginContext = { username: string };

export type TabPluginModule = {
  default: (props: PluginContext) => ReactNode;
  manifest: PluginManifest & { slots: Readonly<["profile:tab"]> };
};

/** ✅ Serializable shape you can return from GSSP */
export type PluginDescriptor = {
  id: string;                 // e.g. "com.example.hello"
  mode: "trusted" | "iframe"; // how to load on client
  label?: string;             // optional UI label override
  iframeUrl?: string;         // for iframe mode
};

/** Runtime shape (not serializable) built on client */
export type InstalledPlugin = PluginDescriptor & {
  load?: () => Promise<TabPluginModule>; // only for trusted mode
};
