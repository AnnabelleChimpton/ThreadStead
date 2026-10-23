import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import FollowButton from '@/components/core/social/FollowButton';
import type { KnownPerson } from '@/lib/domain/bluesky/known-follows';

/**
 * Settings → Bluesky, once connected: residents you already follow on
 * Bluesky, each with a Follow button (lib/domain/bluesky/known-follows.ts).
 * Shows nothing at all when there's nobody, or Bluesky didn't answer.
 */
export default function KnownHere() {
  const [people, setPeople] = useState<KnownPerson[]>([]);

  useEffect(() => {
    let live = true;
    fetch('/api/account/bluesky/known')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { people?: KnownPerson[] } | null) => {
        if (live && Array.isArray(data?.people)) setPeople(data.people);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  if (people.length === 0) return null;

  return (
    <div className="thread-module flex flex-col gap-3">
      <p className="m-0 font-semibold text-nb-ink">Some people you follow on Bluesky live here too!</p>
      <ul className="m-0 p-0 list-none flex flex-col gap-2">
        {people.map((person) => (
          <li key={person.username} className="flex items-center gap-3 flex-wrap">
            <Link href={`/resident/${encodeURIComponent(person.username)}`} className="flex items-center gap-2 min-w-0 flex-1">
              <img
                src={person.avatarUrl || '/assets/default-avatar.gif'}
                alt=""
                width={36}
                height={36}
                className="w-9 h-9 rounded-full border border-nb-ink-mid/40 object-cover flex-shrink-0"
              />
              <span className="min-w-0">
                <span className="block font-semibold text-nb-ink break-words">{person.displayName || person.username}</span>
                <span className="block text-sm text-nb-ink-mid break-all">@{person.username}</span>
              </span>
            </Link>
            <FollowButton username={person.username} />
          </li>
        ))}
      </ul>
    </div>
  );
}
