import React from 'react';
import { TEMPLATE_EXAMPLES } from '@/lib/templates/default-profile-template';
import { HTML_TEMPLATES, getHTMLTemplate } from '@/lib/templates/default-html-templates';
import { PixelIcon } from '@/components/ui/PixelIcon';

interface StarterTemplateGalleryProps {
  onSelect: (template: string, css: string, name: string) => void;
}

interface StarterCard {
  key: string;
  name: string;
  description: string;
  source: 'examples' | 'html';
  icon: 'paint-bucket' | 'zap' | 'code';
}

// Forkable starting points for custom pages, shown as browsable cards instead
// of a bare <select>. Every starter is a complete page you can save as-is,
// then bend to your taste. Three kinds, three promises: redesign your
// profile, script something alive, or just write a beautiful HTML page.
export default function StarterTemplateGallery({ onSelect }: StarterTemplateGalleryProps) {
  const exampleEntries = Object.entries(TEMPLATE_EXAMPLES).map(([key, t]) => ({
    key,
    name: t.name || key,
    description: (t as { description?: string }).description || '',
    kind: (t as { kind?: string }).kind,
  }));

  const profileStarters: StarterCard[] = exampleEntries
    .filter((t) => t.kind !== 'scripted')
    .map((t) => ({ ...t, source: 'examples' as const, icon: 'paint-bucket' as const }));

  const scriptedStarters: StarterCard[] = [
    ...exampleEntries
      .filter((t) => t.kind === 'scripted')
      .map((t) => ({ ...t, source: 'examples' as const, icon: 'zap' as const })),
    ...HTML_TEMPLATES
      .filter((t) => t.id === 'conditional-showcase')
      .map((t) => ({ key: t.id, name: t.name, description: t.description, source: 'html' as const, icon: 'zap' as const })),
  ];

  const htmlStarters: StarterCard[] = HTML_TEMPLATES
    .filter((t) => t.id !== 'conditional-showcase')
    .map((t) => ({ key: t.id, name: t.name, description: t.description, source: 'html' as const, icon: 'code' as const }));

  const pick = (starter: StarterCard) => {
    if (starter.source === 'examples') {
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

  const renderCard = (starter: StarterCard) => (
    <button
      key={`${starter.source}-${starter.key}`}
      onClick={() => pick(starter)}
      className="text-left border-2 border-thread-sage/30 hover:border-thread-pine rounded-lg p-3 bg-thread-paper hover:bg-white transition-colors group"
    >
      <div className="flex items-center gap-2 mb-1">
        <PixelIcon name={starter.icon} size={14} />
        <span className="font-semibold text-sm text-thread-charcoal group-hover:text-thread-pine">
          {starter.name}
        </span>
      </div>
      <p className="text-xs text-thread-sage leading-snug">{starter.description}</p>
    </button>
  );

  const section = (title: string, blurb: string, cards: StarterCard[]) => (
    <div>
      <h5 className="font-medium text-thread-charcoal mb-1">{title}</h5>
      <p className="text-xs text-thread-sage mb-2">{blurb}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {cards.map(renderCard)}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {section(
        'Profile redesigns',
        'Your blog, guestbook, and friends — restyled top to bottom with ThreadStead components.',
        profileStarters
      )}
      {section(
        'Pages that do things',
        'The template language at work: switches, counters, and fortunes that react when visitors click.',
        scriptedStarters
      )}
      {section(
        'Just HTML',
        'Plain, beautiful pages — no components, no scripting. If you can write HTML, you already know how.',
        htmlStarters
      )}
      <p className="text-xs text-thread-sage italic">
        Starters are starting points — everything about them is yours to change.
      </p>
    </div>
  );
}
