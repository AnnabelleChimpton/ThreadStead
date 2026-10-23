import { useEffect, useState } from 'react';
import Link from 'next/link';
import LoadingSpinner from '@/components/ui/feedback/LoadingSpinner';
import EmptyState from '@/components/ui/feedback/EmptyState';
import ErrorDisplay from '@/components/ui/feedback/ErrorDisplay';
import ThreadRing88x31Badge from './ThreadRing88x31Badge';

/** A ring in /api/threadrings/genealogy's tree. */
interface TreeRing {
  id: string;
  name: string;
  slug: string;
  badgeImageUrl?: string | null;
  themeColor?: string | null;
  children?: TreeRing[];
}

/** Past this many levels a phone stops indenting, so deep branches still fit. */
const PHONE_INDENT_LEVELS = 4;

function Branch({ ring, depth }: { ring: TreeRing; depth: number }) {
  const children = ring.children ?? [];
  // The list this ring's children sit in, and the dotted tick from that list's line to each child
  const indent = depth < PHONE_INDENT_LEVELS ? '!ml-[1.1rem] !pl-4' : '!ml-0 !pl-2 sm:!ml-[1.1rem] sm:!pl-4';
  const tick = depth === 0
    ? ''
    : `before:content-[''] before:absolute before:top-[1.45rem] before:border-t-2 before:border-dotted before:border-nb-ink-mid/50 ${
        depth - 1 < PHONE_INDENT_LEVELS ? 'before:-left-4 before:w-3' : 'before:-left-2 before:w-1.5 sm:before:-left-4 sm:before:w-3'
      }`;
  return (
    <li className={`relative !m-0 !p-0 ${tick}`}>
      <Link href={`/tr/${encodeURIComponent(ring.slug)}`} className="flex items-center gap-3 py-2 no-underline">
        <ThreadRing88x31Badge title={ring.name} slug={ring.slug} themeColor={ring.themeColor} imageUrl={ring.badgeImageUrl ?? undefined} className="shrink-0" />
        <span className={`text-nb-ink underline decoration-dotted min-w-0 break-words ${depth === 0 ? 'font-semibold' : ''}`}>{ring.name}</span>
      </Link>
      {children.length > 0 && (
        <ul className={`list-none !my-0 !mr-0 border-l-2 border-dotted border-nb-ink-mid/50 ${indent}`}>
          {children.map((child) => (
            <Branch key={child.id} ring={child} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

/** Every ring the viewer may see, as one indented list from The Spool down. */
export default function ThreadRingGenealogy() {
  const [tree, setTree] = useState<TreeRing | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/threadrings/genealogy?maxDepth=50')
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data) => {
        if (!cancelled) setTree(data.tree ?? null);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <ErrorDisplay title="Couldn't load the family tree. Try again in a minute." />;
  if (!tree) return <LoadingSpinner message="Loading the family tree..." className="py-6" />;
  if (!tree.children?.length) return <EmptyState variant="plain" title="No rings yet" />;
  return (
    <ul className="list-none !m-0 !p-0">
      <Branch ring={tree} depth={0} />
    </ul>
  );
}
