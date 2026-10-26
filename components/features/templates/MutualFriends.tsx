import React, { useEffect, useState } from "react";
import { PixelIcon } from '@/components/ui/PixelIcon';
import { useResidentData } from './ResidentDataProvider';
import { UniversalCSSProps, separateCSSProps, applyCSSProps, removeTailwindConflicts } from '@/lib/templates/styling/universal-css-props';

type MFItem = { userId: string; handle: string; avatarUrl: string };

interface MutualFriendsProps extends UniversalCSSProps {
  className?: string;
}

export default function MutualFriends(props: MutualFriendsProps) {
  const { cssProps, componentProps } = separateCSSProps(props);
  const { className: customClassName } = componentProps;
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

  const baseClasses = "ts-mutual-friends inline-flex flex-col";
  const filteredClasses = removeTailwindConflicts(baseClasses, cssProps);
  const style = applyCSSProps(cssProps);

  const wrapperClassName = customClassName
    ? `${filteredClasses} ${customClassName}`
    : filteredClasses;

  return (
    <div className={wrapperClassName} style={style}>
      <button
        onClick={() => setExpanded(v => !v)}
        className="ts-mutual-friends-button inline-flex items-center gap-2 bg-blue-200 border border-black px-2 py-0.5 text-xs font-bold shadow-[2px_2px_0_#000] rounded"
        aria-expanded={expanded}
        title="Mutual friends"
      >
        <PixelIcon name="users" size={14} />
        <span>Mutual friends: {count}</span>
      </button>

      {expanded && (
        <div className="ts-mutual-friends-list mt-2 grid grid-cols-3 sm:grid-cols-6 gap-2 p-2 bg-white border border-black shadow-[2px_2px_0_#000]">
          {sample.map(m => (
            <a key={m.userId} href={`/${m.handle}`} className="flex flex-col items-center gap-1 no-underline hover:underline">
              <img src={m.avatarUrl} alt={m.handle} className="ts-mutual-friends-avatar w-10 h-10 object-cover border border-black" />
              <span className="text-xs">{m.handle}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}