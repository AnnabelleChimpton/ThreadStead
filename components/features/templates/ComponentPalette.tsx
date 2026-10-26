import React, { useState, useMemo, useRef, useEffect, useId } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { PixelIcon } from '@/components/ui/PixelIcon';
import Button from '@/components/ui/Button';
import type { ResidentData } from '@/components/features/templates/ResidentDataProvider';
import {
  type ComponentSchema,
  componentSnippet,
} from '@/lib/templates/editor/component-autocomplete';
import { COMPONENT_GROUPS } from '@/lib/templates-docs/component-docs';
import { BEGINNER_SECTIONS } from '@/lib/templates-docs/beginner-set';
import { firstSentence, searchComponents } from '@/lib/templates-docs/component-search';

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

const tagOf = (c: ComponentSchema) => `<${c.name}${c.acceptsChildren ? '>' : ' />'}`;

// Clickable components, fed by the registry via /api/templates/
// component-schemas. It starts with the ones to learn first (beginner-set.ts);
// "Show all" lists every one in the reference's groups, and search looks
// through all of them, best match first (component-search.ts). Each row says
// what the component is for in a line; picking one shows what it does, its
// example and the example running with your own data, with a button to put
// it in. Arrow keys move through the list from the search box, Enter picks.
export default function ComponentPalette({ schemas, onInsert, residentData }: ComponentPaletteProps) {
  const [query, setQuery] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [picked, setPicked] = useState<ComponentSchema | null>(null);
  const [active, setActive] = useState(0);
  const listId = useId();
  const pickedRef = useRef<HTMLElement>(null);

  // Grouped while browsing; one list, best first, while searching
  const sections = useMemo(() => {
    if (!schemas) return [];
    if (query.trim()) return [{ id: 'matches', title: '', components: searchComponents(schemas, query) }];
    if (!showAll) {
      const byName = new Map(schemas.map((c) => [c.name, c]));
      return BEGINNER_SECTIONS.map((section) => ({
        id: section.id,
        title: section.title,
        components: section.components.map((name) => byName.get(name)).filter((c): c is ComponentSchema => !!c),
      }));
    }
    return COMPONENT_GROUPS
      .map((group) => ({ id: group.id, title: group.title, components: schemas.filter((c) => c.group === group.id) }))
      .filter((section) => section.components.length > 0);
  }, [schemas, query, showAll]);

  const shown = useMemo(() => sections.flatMap((section) => section.components), [sections]);
  useEffect(() => setActive(0), [query, showAll]);
  useEffect(() => {
    if (picked) pickedRef.current?.scrollIntoView?.({ block: 'nearest' });
  }, [picked]);

  const pick = (c: ComponentSchema) => setPicked(c);
  const optionId = (index: number) => `${listId}-${index}`;

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (shown.length === 0) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const next = (active + (event.key === 'ArrowDown' ? 1 : -1) + shown.length) % shown.length;
      setActive(next);
      document.getElementById(optionId(next))?.scrollIntoView?.({ block: 'nearest' });
    } else if (event.key === 'Enter') {
      event.preventDefault();
      pick(shown[active] ?? shown[0]);
    }
  };

  let index = -1;
  return (
    <div>
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <PixelIcon name="search" size={14} />
        <input
          type="search"
          role="combobox"
          aria-label="Search components"
          aria-expanded={shown.length > 0}
          aria-controls={listId}
          aria-activedescendant={shown.length > 0 ? optionId(active) : undefined}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={schemas ? `Search all ${schemas.length}: a name, or what you want, like music or game` : 'Loading components…'}
          className="flex-1 min-w-[10rem] text-sm px-2 py-1.5 border border-thread-sage rounded bg-thread-paper focus:border-thread-pine focus:ring-1 focus:ring-thread-pine"
          disabled={!schemas}
        />
        <span className="text-xs text-thread-sage">
          <Link href="/build/templates/components" target="_blank" className="underline hover:text-thread-pine">
            What each one does
          </Link>
        </span>
      </div>

      {schemas && shown.length === 0 && (
        <p className="text-sm text-thread-sage px-1 py-2">
          Nothing matches &quot;{query}&quot;. Try a tag name, like Guestbook, or what you want, like music.
        </p>
      )}

      <div id={listId} role="listbox" aria-label="Components" className="max-h-[min(26rem,50vh)] overflow-y-auto pr-1 border border-thread-sage/40 rounded bg-thread-paper">
        {sections.map((section) => (
          <div key={section.id} role="group" aria-label={section.title || 'Matches'}>
            {section.title && (
              <div className="sticky top-0 z-[1] px-2 py-1 text-xs font-semibold text-thread-pine bg-thread-cream border-b border-thread-sage/30">
                {section.title}
              </div>
            )}
            {section.components.map((c) => {
              index++;
              const at = index;
              const isActive = at === active;
              return (
                <div
                  key={c.name}
                  id={optionId(at)}
                  role="option"
                  aria-selected={picked?.name === c.name}
                  onClick={() => {
                    setActive(at);
                    pick(c);
                  }}
                  onMouseMove={() => setActive(at)}
                  className={`flex items-baseline gap-2 px-2 py-1.5 cursor-pointer border-b border-thread-sage/15 last:border-b-0 ${
                    isActive ? 'bg-thread-cream' : ''
                  } ${picked?.name === c.name ? 'font-semibold' : ''}`}
                >
                  <code className="shrink-0 font-mono text-xs text-thread-pine">{tagOf(c)}</code>
                  <span className="min-w-0 truncate text-xs text-nb-ink-mid">{firstSentence(c.description)}</span>
                </div>
              );
            })}
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
        <section ref={pickedRef} aria-label={picked.name} className="mt-3 border-2 border-thread-sage bg-thread-paper p-3 scroll-mt-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h4 className="m-0 font-mono text-sm text-nb-ink">{tagOf(picked)}</h4>
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
