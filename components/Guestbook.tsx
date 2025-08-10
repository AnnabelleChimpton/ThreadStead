import { GetServerSideProps } from "next";
import RetroCard from "./RetroCard";
import RetroButton from "./RetroButton";
import { useEffect, useState } from "react";

type ProfileProps = {
  username: string;
  bio: string;
  customCSS?: string;
};

export default function Profile({ username, bio, customCSS }: ProfileProps) {
  const [entries, setEntries] = useState<string[]>([]);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/guestbook/${username}`).then(r => r.json()).then(d => setEntries(d.entries));
  }, [username]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msg.trim()) return;
    setLoading(true);
    await fetch(`/api/guestbook/${username}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: msg.trim() }),
    });
    setMsg("");
    const d = await (await fetch(`/api/guestbook/${username}`)).json();
    setEntries(d.entries);
    setLoading(false);
  };

  return (
    <>
      {customCSS && <style dangerouslySetInnerHTML={{ __html: customCSS }} />}
        <div className="space-y-4">
          <RetroCard title="Guestbook">
            <ul className="space-y-2 mb-3">
              {entries.map((e, i) => (
                <li key={i} className="border border-retro-border bg-white p-2 shadow-retroSm">{e}</li>
              ))}
              {entries.length === 0 && <li className="text-sm italic opacity-70">No entries yet—be the first!</li>}
            </ul>

            <form onSubmit={submit} className="space-y-2">
              <label className="block text-sm font-semibold" htmlFor="gb-msg">Leave a message</label>
              <textarea
                id="gb-msg"
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                className="w-full border border-retro-border p-2"
                rows={3}
                placeholder="Write something nice…"
              />
              <RetroButton type="submit" loading={loading}>Sign Guestbook</RetroButton>
            </form>
          </RetroCard>
        </div>
    </>
  );
}

// Mock server data; keep your existing getServerSideProps
export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  const username = String(params?.username || "guest");
  return { props: { username, bio: `Hi, I'm ${username}! Welcome to my retro page.` } };
};
