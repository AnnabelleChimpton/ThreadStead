import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { PixelIcon } from '@/components/ui/PixelIcon';
import {
  type ComponentSchema,
  componentSnippet,
  describeProps,
} from '@/lib/templates/editor/component-autocomplete';
import { COMPONENT_GROUPS } from '@/lib/templates-docs/component-docs';
import { BEGINNER_SECTIONS } from '@/lib/templates-docs/beginner-set';

interface ComponentPaletteProps {
  schemas: ComponentSchema[] | null;
  onInsert: (snippet: string) => void;
}

// Clickable components, fed by the registry via /api/templates/
// component-schemas. It starts with the ones to learn first (beginner-set.ts);
// "Show all" lists every one in the reference's groups, and search always
// looks through all of them.
export default function ComponentPalette({ schemas, onInsert }: ComponentPaletteProps) {
  const [query, setQuery] = useState('');
  const [showAll, setShowAll] = useState(false);

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
          Click one to drop it in at your cursor.{' '}
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
                  onClick={() => onInsert(componentSnippet(c))}
                  title={describeProps(c)}
                  className="bg-thread-paper hover:bg-thread-cream px-2 py-1 rounded text-xs border border-thread-sage/30 hover:border-thread-pine font-mono transition-colors"
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
    </div>
  );
}
