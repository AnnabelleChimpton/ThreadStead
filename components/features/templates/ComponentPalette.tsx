import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { PixelIcon } from '@/components/ui/PixelIcon';
import Button from '@/components/ui/Button';
import type { ResidentData } from '@/components/features/templates/ResidentDataProvider';
import {
  type ComponentSchema,
  componentSnippet,
  describeProps,
} from '@/lib/templates/editor/component-autocomplete';
import { COMPONENT_GROUPS } from '@/lib/templates-docs/component-docs';
import { BEGINNER_SECTIONS } from '@/lib/templates-docs/beginner-set';

// The component running for real: loaded when one is picked
const ComponentPreview = dynamic(() => import('./ComponentPreview'), {
  ssr: false,
  loading: () => <p className="m-0 text-xs text-nb-ink-mid">Getting it ready…</p>,
});

interface ComponentPaletteProps {
  schemas: ComponentSchema[] | null;
  onInsert: (snippet: string) => void;
  /** Your page's data, so the preview shows your own guestbook, posts and friends */
  residentData?: ResidentData | null;
}

// Clickable components, fed by the registry via /api/templates/
// component-schemas. It starts with the ones to learn first (beginner-set.ts);
// "Show all" lists every one in the reference's groups, and search always
// looks through all of them. Picking one shows what it does, its example and
// the example running with your own data, with a button to put it in: a
// tooltip said what it did, which a phone never shows.
export default function ComponentPalette({ schemas, onInsert, residentData }: ComponentPaletteProps) {
  const [query, setQuery] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [picked, setPicked] = useState<ComponentSchema | null>(null);

  const filtered = useMemo(() => {
    if (!schemas) return [];
    const q = query.trim().toLowerCase();
    if (!q) return schemas;
    return schemas.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.description ?? '').toLowerCase().includes(q)
    );
  }, [schemas, query]);

  // Grouped while browsing; one list of matches while searching
  const sections = useMemo(() => {
    if (query.trim()) return [{ id: 'matches', title: '', components: filtered }];
    if (!showAll) {
      const byName = new Map(filtered.map((c) => [c.name, c]));
      return BEGINNER_SECTIONS.map((section) => ({
        id: section.id,
        title: section.title,
        components: section.components.map((name) => byName.get(name)).filter((c): c is ComponentSchema => !!c),
      }));
    }
    return COMPONENT_GROUPS
      .map((group) => ({ id: group.id, title: group.title, components: filtered.filter((c) => c.group === group.id) }))
      .filter((section) => section.components.length > 0);
  }, [filtered, query, showAll]);

  return (
    <div>
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <PixelIcon name="search" size={14} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={schemas ? `Search all ${schemas.length} components…` : 'Loading components…'}
          className="flex-1 min-w-[10rem] text-sm px-2 py-1.5 border border-thread-sage rounded bg-thread-paper focus:border-thread-pine focus:ring-1 focus:ring-thread-pine"
          disabled={!schemas}
        />
        <span className="text-xs text-thread-sage">
          <Link href="/build/templates/components" target="_blank" className="underline hover:text-thread-pine">
            What each one does
          </Link>
        </span>
      </div>

      {schemas && filtered.length === 0 && (
        <p className="text-sm text-thread-sage px-1 py-2">
          No components match &quot;{query}&quot;.
        </p>
      )}

      <div className="max-h-56 overflow-y-auto pr-1 space-y-2">
        {sections.map((section) => (
          <div key={section.id}>
            {section.title && (
              <h4 className="text-xs font-semibold text-thread-pine mb-1">{section.title}</h4>
            )}
            <div className="flex flex-wrap gap-1.5">
              {section.components.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setPicked(c)}
                  aria-pressed={picked?.name === c.name}
                  title={describeProps(c)}
                  className="ts-chip text-xs font-mono"
                >
                  &lt;{c.name}{c.acceptsChildren ? '>' : ' />'}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      {schemas && !query.trim() && (
        <button
          type="button"
          className="ts-bare mt-2 text-xs underline text-thread-pine"
          onClick={() => setShowAll((v) => !v)}
        >
          {showAll ? 'Just the ones to start with' : `Show all ${schemas.length}`}
        </button>
      )}

      {picked && (
        <section aria-label={picked.name} className="mt-3 border-2 border-thread-sage bg-thread-paper p-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h4 className="m-0 font-mono text-sm text-nb-ink">&lt;{picked.name}{picked.acceptsChildren ? '>' : ' />'}</h4>
            <Link href={`/build/templates/components#${picked.id}`} target="_blank" className="text-xs underline text-thread-pine">
              All its settings
            </Link>
          </div>
          {picked.description && <p className="mt-1 mb-2 text-sm text-nb-ink">{picked.description}</p>}
          {picked.parent && <p className="mt-0 mb-2 text-xs text-nb-ink-mid">It goes inside &lt;{picked.parent}&gt;.</p>}
          <pre className="m-0 mb-2 p-2 bg-white border border-thread-sage/40 text-xs overflow-x-auto whitespace-pre-wrap">{picked.example}</pre>
          <div className="mb-2 p-3 bg-white border-2 border-dashed border-thread-sage max-h-64 overflow-auto">
            {picked.group === 'logic'
              ? <p className="m-0 text-xs text-nb-ink-mid">It shows nothing by itself: it works with the components around it, as in the example.</p>
              : residentData
                ? <ComponentPreview example={picked.example} residentData={residentData} />
                : <p className="m-0 text-xs text-nb-ink-mid">Getting your page&apos;s data…</p>}
          </div>
          <Button size="sm" onClick={() => onInsert(componentSnippet(picked))}>
            Put it in my page
          </Button>
        </section>
      )}
    </div>
  );
}
