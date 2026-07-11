import React, { useState, useMemo } from 'react';
import { PixelIcon } from '@/components/ui/PixelIcon';
import {
  type ComponentSchema,
  componentSnippet,
  describeProps,
} from '@/lib/templates/editor/component-autocomplete';

interface ComponentPaletteProps {
  schemas: ComponentSchema[] | null;
  onInsert: (snippet: string) => void;
}

// Searchable, clickable list of every registered template component.
// Fed by the registry via /api/templates/component-schemas — never a
// hand-maintained list.
export default function ComponentPalette({ schemas, onInsert }: ComponentPaletteProps) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!schemas) return [];
    const q = query.trim().toLowerCase();
    if (!q) return schemas;
    return schemas.filter((c) => c.name.toLowerCase().includes(q));
  }, [schemas, query]);

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <PixelIcon name="search" size={14} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={schemas ? `Search ${schemas.length} components…` : 'Loading components…'}
          className="flex-1 text-sm px-2 py-1.5 border border-thread-sage rounded bg-thread-paper focus:border-thread-pine focus:ring-1 focus:ring-thread-pine"
          disabled={!schemas}
        />
        <span className="text-xs text-thread-sage">Click one to drop it in at your cursor</span>
      </div>

      {schemas && filtered.length === 0 && (
        <p className="text-sm text-thread-sage px-1 py-2">
          No components match &quot;{query}&quot;.
        </p>
      )}

      <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1">
        {filtered.map((c) => (
          <button
            key={c.name}
            onClick={() => onInsert(componentSnippet(c))}
            title={describeProps(c)}
            className="bg-thread-paper hover:bg-thread-cream px-2 py-1 rounded text-xs border border-thread-sage/30 hover:border-thread-pine font-mono transition-colors"
          >
            &lt;{c.name}{c.acceptsChildren ? '>' : ' />'}
          </button>
        ))}
      </div>
    </div>
  );
}
