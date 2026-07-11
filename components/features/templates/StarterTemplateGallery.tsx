import React from 'react';
import { TEMPLATE_EXAMPLES } from '@/lib/templates/default-profile-template';
import { HTML_TEMPLATES, getHTMLTemplate } from '@/lib/templates/default-html-templates';
import { PixelIcon } from '@/components/ui/PixelIcon';

interface StarterTemplateGalleryProps {
  onSelect: (template: string, css: string, name: string) => void;
}

// Forkable starting points for custom pages, shown as browsable cards instead
// of a bare <select>. Every starter is a complete page you can save as-is,
// then bend to your taste.
export default function StarterTemplateGallery({ onSelect }: StarterTemplateGalleryProps) {
  const modernStarters = Object.entries(TEMPLATE_EXAMPLES).map(([key, t]) => ({
    key,
    name: t.name || key,
    description: (t as { description?: string }).description || '',
    kind: 'modern' as const,
  }));

  const classicStarters = HTML_TEMPLATES.map((t) => ({
    key: t.id,
    name: t.name,
    description: t.description,
    kind: 'classic' as const,
  }));

  const pick = (starter: { key: string; name: string; kind: 'modern' | 'classic' }) => {
    if (starter.kind === 'modern') {
      const t = TEMPLATE_EXAMPLES[starter.key as keyof typeof TEMPLATE_EXAMPLES];
      onSelect(t.template, t.css, starter.name);
    } else {
      const raw = getHTMLTemplate(starter.key);
      const styleMatch = raw.match(/<style[^>]*>([\s\S]*?)<\/style>/);
      const css = styleMatch ? styleMatch[1] : '';
      const html = raw.replace(/<style[^>]*>[\s\S]*?<\/style>/, '').trim();
      onSelect(html, css, starter.name);
    }
  };

  const renderCard = (starter: { key: string; name: string; description: string; kind: 'modern' | 'classic' }) => (
    <button
      key={`${starter.kind}-${starter.key}`}
      onClick={() => pick(starter)}
      className="text-left border-2 border-thread-sage/30 hover:border-thread-pine rounded-lg p-3 bg-thread-paper hover:bg-white transition-colors group"
    >
      <div className="flex items-center gap-2 mb-1">
        <PixelIcon name={starter.kind === 'modern' ? 'zap' : 'archive'} size={14} />
        <span className="font-semibold text-sm text-thread-charcoal group-hover:text-thread-pine">
          {starter.name}
        </span>
      </div>
      <p className="text-xs text-thread-sage leading-snug">{starter.description}</p>
    </button>
  );

  return (
    <div className="space-y-4">
      <div>
        <h5 className="font-medium text-thread-charcoal mb-1">Component starters</h5>
        <p className="text-xs text-thread-sage mb-2">
          Built with ThreadStead components — blog, guestbook, and friends wired up out of the box.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {modernStarters.map(renderCard)}
        </div>
      </div>

      <div>
        <h5 className="font-medium text-thread-charcoal mb-1">Classic HTML starters</h5>
        <p className="text-xs text-thread-sage mb-2">
          Full pages in the old-web spirit — save one as-is, then make it yours.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {classicStarters.map(renderCard)}
        </div>
      </div>

      <p className="text-xs text-thread-sage italic">
        Starters are starting points — everything about them is yours to change.
      </p>
    </div>
  );
}
