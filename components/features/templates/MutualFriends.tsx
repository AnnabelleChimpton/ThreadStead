import React, { useEffect, useState } from "react";
import { useResidentData } from './ResidentDataProvider';

type MFItem = { userId: string; handle: string; avatarUrl: string };

export default function MutualFriends() {
  const { owner, viewer } = useResidentData();
  const [count, setCount] = useState<number>(0);
  const [sample, setSample] = useState<MFItem[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Check if viewer is the owner or anonymous
  const isOwner = viewer.id === owner.id;
  const isAnonymous = !viewer.id;

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const r = await fetch(`/api/mutuals/${encodeURIComponent(owner.handle)}`);
        if (!r.ok) throw new Error(`mutuals ${r.status}`);
        const data = await r.json();
        if (!alive) return;
        setCount(data.count || 0);
        setSample(Array.isArray(data.sample) ? data.sample : []);
      } catch (e: any) {
        if (alive) setErr(e?.message || "Failed to load");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [owner.handle]);

  // Hide if it's your own page, you're anonymous, loading/errored, or there are no mutuals
  if (loading || err || isOwner || isAnonymous || count === 0) return null;

  return (
    <div className="inline-flex flex-col">
      <button
        onClick={() => setExpanded(v => !v)}
        className="inline-flex items-center gap-2 bg-blue-200 border border-black px-2 py-0.5 text-xs font-bold shadow-[2px_2px_0_#000] rounded"
        aria-expanded={expanded}
        title="Mutual friends"
      >
        <span>🫂</span>
        <span>Mutual friends: {count}</span>
      </button>

      {expanded && (
        <div className="mt-2 grid grid-cols-3 sm:grid-cols-6 gap-2 p-2 bg-white border border-black shadow-[2px_2px_0_#000]">
          {sample.map(m => (
            <a key={m.userId} href={`/${m.handle}`} className="flex flex-col items-center gap-1 no-underline hover:underline">
              <img src={m.avatarUrl} alt={m.handle} className="w-10 h-10 object-cover border border-black" />
              <span className="text-xs">{m.handle}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}