import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { PixelIcon } from '@/components/ui/PixelIcon';
import {
  type ComponentSchema,
  componentSnippet,
  describeProps,
} from '@/lib/templates/editor/component-autocomplete';
import { COMPONENT_GROUPS } from '@/lib/templates-docs/component-docs';

interface ComponentPaletteProps {
  schemas: ComponentSchema[] | null;
  onInsert: (snippet: string) => void;
}

// Searchable, clickable list of every registered template component, in the
// component reference's order (connected ones first). Fed by the registry
// via /api/templates/component-schemas — never a hand-maintained list.
export default function ComponentPalette({ schemas, onInsert }: ComponentPaletteProps) {
  const [query, setQuery] = useState('');

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
    return COMPONENT_GROUPS
      .map((group) => ({ id: group.id, title: group.title, components: filtered.filter((c) => c.group === group.id) }))
      .filter((section) => section.components.length > 0);
  }, [filtered, query]);

  return (
    <div>
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <PixelIcon name="search" size={14} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={schemas ? `Search ${schemas.length} components…` : 'Loading components…'}
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
    </div>
  );
}
