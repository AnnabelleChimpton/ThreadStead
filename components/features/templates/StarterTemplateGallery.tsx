import React from 'react';
import { STARTERS, splitStarter } from '@/lib/templates/starters';

interface StarterTemplateGalleryProps {
  onSelect: (template: string, css: string, name: string) => void;
}

/**
 * The starter pages, simplest first, each with a picture of it filled in
 * (public/starters/<id>.png). Picking one puts its HTML and CSS in the editor.
 */
export default function StarterTemplateGallery({ onSelect }: StarterTemplateGalleryProps) {
  return (
    <div>
      <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3 list-none p-0 m-0">
        {STARTERS.map((starter) => (
          <li key={starter.id}>
            <button
              type="button"
              className="ts-bare block w-full text-left group"
              onClick={() => {
                const { html, css } = splitStarter(starter.template);
                onSelect(html, css, starter.name);
              }}
            >
              <img
                src={`/starters/${starter.id}.png`}
                alt=""
                width={320}
                height={200}
                loading="lazy"
                className="block w-full h-auto border border-black/20 group-hover:border-black"
              />
              <span className="block text-sm font-semibold mt-1 text-nb-ink">{starter.name}</span>
              <span className="block text-xs text-nb-ink-mid leading-snug">{starter.description}</span>
            </button>
          </li>
        ))}
      </ul>
      <p className="text-xs text-nb-ink-mid mt-3">
        Pick one and change whatever you like. Your old page stays in History.
      </p>
    </div>
  );
}
