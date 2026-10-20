import React, { useState } from 'react';
import Modal from '@/components/ui/feedback/Modal';
import Button from '@/components/ui/Button';
import ThemeSwatch from '@/components/features/profile/ThemeSwatch';
import { getDefaultProfileTemplate, type ProfileTemplateType } from '@/lib/templates/default-profile-templates';
import { THEMES, detectTheme } from '@/lib/templates/appearance';

interface TemplatePanelSelectorProps {
  currentCSS?: string;
  onSelectTemplate: (css: string, templateName: string) => void;
  onClose: () => void;
}

/**
 * The CSS editor's theme gallery: the same themes and swatches as Settings >
 * Your page (each drawn from the theme's own variables), loaded into the
 * editor rather than saved straight away.
 */
export default function TemplatePanelSelector({ currentCSS, onSelectTemplate, onClose }: TemplatePanelSelectorProps) {
  const [selected, setSelected] = useState<ProfileTemplateType | 'clear' | null>(null);
  const current = detectTheme(currentCSS);

  const load = () => {
    if (selected === 'clear') {
      onSelectTemplate('/* Add your custom CSS here */\n\n', 'A blank stylesheet');
    } else if (selected) {
      const theme = THEMES.find((t) => t.id === selected)!;
      onSelectTemplate(getDefaultProfileTemplate(selected), theme.name);
    }
  };

  const footer = (
    <div className="flex flex-wrap justify-end gap-2">
      <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
      <Button size="sm" onClick={load} disabled={!selected}>
        {selected === 'clear' ? 'Load blank' : 'Load theme'}
      </Button>
    </div>
  );

  const ring = (on: boolean) => (on ? 'outline outline-2 outline-offset-2 outline-black' : '');

  return (
    <Modal isOpen onClose={onClose} title="Choose a theme" maxWidth="max-w-4xl" footer={footer} bodyClassName="">
      <p className="text-sm text-nb-ink-mid px-4 sm:px-6 pt-3">
        Load a theme into the editor. Nothing changes until you save.
      </p>
      <ul className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 list-none m-0">
        {THEMES.map((theme) => (
          <li key={theme.id}>
            <button
              type="button"
              className={`ts-bare block w-full text-left ${ring(selected === theme.id)}`}
              aria-pressed={selected === theme.id}
              onClick={() => setSelected(theme.id)}
            >
              <ThemeSwatch vars={theme.vars} name={theme.name} line={theme.description} />
              <span className="block text-sm font-semibold mt-1 text-nb-ink">
                {theme.name}
                {current === theme.id && <span className="font-normal text-nb-ink-mid"> (yours now)</span>}
              </span>
            </button>
          </li>
        ))}
        <li>
          <button
            type="button"
            className={`ts-bare block w-full text-left ${ring(selected === 'clear')}`}
            aria-pressed={selected === 'clear'}
            onClick={() => setSelected('clear')}
          >
            <span aria-hidden="true" className="block w-full p-3 border border-black/20 bg-white">
              <span className="block p-2 border border-dashed border-black/30 text-xs text-nb-ink-mid">
                An empty stylesheet.
              </span>
            </span>
            <span className="block text-sm font-semibold mt-1 text-nb-ink">Blank</span>
          </button>
        </li>
      </ul>
    </Modal>
  );
}
