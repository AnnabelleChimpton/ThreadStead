import React, { useEffect, useState } from "react";
import Image from "next/image";
import UserMention from "@/components/ui/navigation/UserMention";
import { PixelIcon } from '@/components/ui/PixelIcon';

type MFItem = { userId: string; handle: string; avatarUrl: string };

export default function MutualFriends({ username }: { username: string }) {
  const [count, setCount] = useState<number>(0);
  const [sample, setSample] = useState<MFItem[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [owner, setOwner] = useState(false);
  const [anon, setAnon] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const r = await fetch(`/api/mutuals/${encodeURIComponent(username)}`);
        if (!r.ok) throw new Error(`mutuals ${r.status}`);
        const data = await r.json();
        if (!alive) return;
        setOwner(!!data.owner);
        setAnon(!!data.anon);
        setCount(data.count || 0);
        setSample(Array.isArray(data.sample) ? data.sample : []);
      } catch (e: any) {
        if (alive) setErr(e?.message || "Failed to load");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [username]);

  // 🔹 Hide if it's your own page, you're anonymous, loading/errored, or there are no mutuals
  if (loading || err || owner || anon || count === 0) return null;

  return (
    <div className="inline-flex flex-col">
      <button
        onClick={() => setExpanded(v => !v)}
        className="inline-flex items-center gap-2 bg-blue-200 border border-black px-2 py-0.5 text-xs font-bold shadow-[2px_2px_0_#000] rounded"
        aria-expanded={expanded}
        title="Mutual friends"
      >
        <PixelIcon name="users" />
        <span>Mutual friends: {count}</span>
      </button>

      {expanded && (
        <div className="mt-2 grid grid-cols-3 sm:grid-cols-6 gap-2 p-2 bg-white border border-black shadow-[2px_2px_0_#000]">
          {sample.map(m => (
            <div key={m.userId} className="flex flex-col items-center gap-1">
              <Image src={m.avatarUrl} alt={m.handle} width={40} height={40} className="w-10 h-10 object-cover border border-black" unoptimized={m.avatarUrl?.endsWith('.gif')} />
              <UserMention
                username={m.handle}
                className="text-xs"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
