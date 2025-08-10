import type { TabPluginModule } from "@/types/plugins";

function HelloTab({ username }: { username: string }) {
  return (
    <div className="space-y-2">
      <h4 className="font-bold">Hello, {username}!</h4>
      <p>This tab was injected by a <em>plugin</em>.</p>
    </div>
  );
}

export const manifest = {
  id: "com.example.hello",
  name: "Hello",
  version: "1.0.0",
  slots: ["profile:tab"] as const,
  trusted: true,
};

const mod: TabPluginModule = {
  manifest,
  default: (ctx) => <HelloTab username={ctx.username} />,
};
export default mod;
