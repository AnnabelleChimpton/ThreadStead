/**
 * Settings > Your page: the light way to make a profile yours, without
 * opening a code editor. Pick a theme (one click, saved, undoable), nudge
 * its colours and fonts, add widgets under the header, hide tabs, and watch
 * the real page change beside it. The code editors are links at the bottom.
 *
 * Themes and knobs: lib/templates/appearance.ts. Widgets: WidgetSlotPicker.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/feedback/LoadingSpinner';
import WidgetSlotPicker from '@/components/features/profile/WidgetSlotPicker';
import { csrfFetch } from '@/lib/api/client/csrf-fetch';
import { useToast } from '@/contexts/ToastContext';
import { useConfirm } from '@/contexts/ConfirmContext';
import {
  FONT_CHOICES,
  THEMES,
  detectTheme,
  knobsBlock,
  readKnobs,
  readThemeVars,
  writeKnobs,
  type Knobs,
  type Theme,
  type ThemeVars,
} from '@/lib/templates/appearance';
import { PRESET_FONT_FACES } from '@/lib/templates/preset-fonts';
import { scopeAwayFromSiteChrome } from '@/lib/utils/css/css-transform';
import { escapeCssForStyleTag } from '@/lib/utils/sanitization/css';
import { HIDEABLE_TABS } from '@/lib/domain/profile/tabs';
import { layoutFields, layoutOf, type Layout } from '@/lib/domain/profile/layout';

type TemplateMode = 'default' | 'enhanced' | 'advanced';

interface PageState {
  customCSS: string;
  templateMode: TemplateMode;
  hiddenTabs: string[];
}

// Every self-hosted font, so the theme cards show their real type
const SWATCH_FONTS = Object.values(PRESET_FONT_FACES).join('\n');

const PREVIEW_STYLE_ID = 'your-page-preview-knobs';

function ThemeSwatch({ vars, name }: { vars: ThemeVars; name: string }) {
  const card = vars.card === 'transparent' ? vars.ground : vars.card;
  return (
    <span
      aria-hidden="true"
      className="block w-full p-3 border border-black/20"
      style={{ background: vars.ground, color: vars.ink, fontFamily: vars.fontBody }}
    >
      <span className="block p-2" style={{ background: card, border: `1px solid ${vars.ink}33` }}>
        <span className="block text-base leading-tight break-words" style={{ fontFamily: vars.fontHead }}>
          {name}
        </span>
        <span className="block text-xs mt-1 opacity-80">Notes from my balcony</span>
        <span
          className="inline-block text-[11px] mt-2 px-2 py-0.5"
          style={{ background: vars.accent, color: vars.onAccent }}
        >
          Guestbook
        </span>
      </span>
    </span>
  );
}

export default function YourPage({ username }: { username: string }) {
  const { showSuccess, showError } = useToast();
  const confirm = useConfirm();
  const [page, setPage] = useState<PageState | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [undo, setUndo] = useState<{ label: string; previous: PageState } | null>(null);
  const [knobs, setKnobs] = useState<Knobs>({});
  const [previewKey, setPreviewKey] = useState(0);
  const previewRef = useRef<HTMLIFrameElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/profile/${encodeURIComponent(username)}`);
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      const next: PageState = {
        customCSS: data.profile?.customCSS || '',
        templateMode: (data.profile?.templateMode || 'default') as TemplateMode,
        hiddenTabs: Array.isArray(data.profile?.hiddenTabs) ? data.profile.hiddenTabs : [],
      };
      setPage(next);
      setKnobs(readKnobs(next.customCSS));
    } catch {
      setLoadError(true);
    }
  }, [username]);

  useEffect(() => {
    load();
  }, [load]);

  const currentTheme = page ? detectTheme(page.customCSS) : null;
  const themeVars = page ? readThemeVars(page.customCSS) : null;
  const savedKnobs = useMemo(() => (page ? readKnobs(page.customCSS) : {}), [page]);
  const knobsChanged = JSON.stringify(knobs) !== JSON.stringify(savedKnobs);
  const ownHTML = layoutOf(page?.templateMode) === 'html';

  // Unsaved knob changes show in the preview straight away, through the same
  // scoping the real page applies (so they win exactly as the saved ones will)
  const applyPreviewKnobs = useCallback(() => {
    const doc = previewRef.current?.contentDocument;
    if (!doc?.head) return;
    let style = doc.getElementById(PREVIEW_STYLE_ID);
    if (!style) {
      style = doc.createElement('style');
      style.id = PREVIEW_STYLE_ID;
      doc.head.appendChild(style);
    }
    style.textContent = knobsChanged ? scopeAwayFromSiteChrome(knobsBlock(knobs)) : '';
  }, [knobs, knobsChanged]);

  useEffect(() => {
    applyPreviewKnobs();
  }, [applyPreviewKnobs]);

  async function setLayout(layout: Layout) {
    const capRes = await csrfFetch('/api/cap/profile', { method: 'POST' });
    const { token } = await capRes.json();
    const res = await csrfFetch('/api/profile/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...layoutFields({ layout }), cap: token }),
    });
    if (!res.ok) throw new Error('layout');
  }

  async function saveCSS(customCSS: string) {
    const res = await csrfFetch(`/api/profile/${encodeURIComponent(username)}/css`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customCSS }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'css');
  }

  async function chooseTheme(theme: Theme | null) {
    if (!page || busy) return;
    if (ownHTML) {
      const ok = await confirm({
        title: 'Switch back to the standard layout?',
        message:
          "Themes style the standard profile layout. Your page uses your own HTML, which stays saved in the HTML editor, so you can switch back to it any time.",
        confirmText: theme ? `Use ${theme.name}` : "Use the site's look",
      });
      if (!ok) return;
    }
    setBusy(true);
    const previous = page;
    try {
      const res = await csrfFetch('/api/user/profile-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template: theme ? theme.id : 'none' }),
      });
      if (!res.ok) throw new Error('theme');
      await load();
      setPreviewKey((k) => k + 1);
      setUndo({ label: theme ? `${theme.name} is on.` : "Your page has the site's own look.", previous });
    } catch {
      showError("Couldn't change your theme. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function undoTheme() {
    if (!undo || busy) return;
    setBusy(true);
    try {
      await saveCSS(undo.previous.customCSS);
      const previousLayout = layoutOf(undo.previous.templateMode);
      if (previousLayout !== layoutOf(page?.templateMode)) await setLayout(previousLayout);
      await load();
      setPreviewKey((k) => k + 1);
      setUndo(null);
      showSuccess('Put back.');
    } catch {
      showError("Couldn't undo that. Your old look is in the CSS editor's History.");
    } finally {
      setBusy(false);
    }
  }

  async function saveKnobs(next: Knobs) {
    if (!page || busy) return;
    setBusy(true);
    try {
      await saveCSS(writeKnobs(page.customCSS, next));
      await load();
      setKnobs(next);
      setPreviewKey((k) => k + 1);
      setUndo(null);
      showSuccess('Saved.');
    } catch (error) {
      showError(error instanceof Error && error.message !== 'css' ? error.message : "Couldn't save. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleTab(id: string, hidden: boolean) {
    if (!page || busy) return;
    const hiddenTabs = hidden ? [...page.hiddenTabs, id] : page.hiddenTabs.filter((t) => t !== id);
    setBusy(true);
    try {
      const capRes = await csrfFetch('/api/cap/profile', { method: 'POST' });
      const { token } = await capRes.json();
      const res = await csrfFetch('/api/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hiddenTabs, cap: token }),
      });
      if (!res.ok) throw new Error('tabs');
      setPage({ ...page, hiddenTabs });
      setPreviewKey((k) => k + 1);
    } catch {
      showError("Couldn't save that. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (loadError) {
    return <p className="text-nb-ink-mid">Your page settings didn&apos;t load. Refresh to try again.</p>;
  }
  if (!page) return <LoadingSpinner message="Loading your page…" className="py-8" />;

  const shown = themeVars ? { ...themeVars, ...knobs } : null;

  return (
    <div className="space-y-8">
      <style dangerouslySetInnerHTML={{ __html: escapeCssForStyleTag(SWATCH_FONTS) }} />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-start">
        <div className="space-y-8 min-w-0">
          {/* Theme */}
          <section aria-labelledby="your-page-theme">
            <h3 id="your-page-theme" className="text-lg font-bold mb-1 text-nb-ink">Theme</h3>
            <p className="text-sm text-nb-ink-mid mb-3">
              {ownHTML
                ? "Your page is your own HTML right now, so these don't show on it."
                : 'One click puts it on your page. Your old look stays in History.'}
            </p>
            <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3 list-none p-0 m-0">
              {THEMES.map((theme) => {
                const on = !ownHTML && currentTheme === theme.id;
                return (
                  <li key={theme.id}>
                    <button
                      type="button"
                      className={`ts-bare block w-full text-left ${on ? 'outline outline-2 outline-offset-2 outline-black' : ''}`}
                      aria-pressed={on}
                      disabled={busy}
                      onClick={() => chooseTheme(theme)}
                      title={theme.description}
                    >
                      <ThemeSwatch vars={theme.vars} name={theme.name} />
                      <span className="block text-sm font-semibold mt-1 text-nb-ink">
                        {theme.name}
                        {on && <span className="font-normal text-nb-ink-mid"> (on)</span>}
                      </span>
                      <span className="block text-xs text-nb-ink-mid">{theme.description}</span>
                    </button>
                  </li>
                );
              })}
              <li>
                <button
                  type="button"
                  className={`ts-bare block w-full text-left ${!ownHTML && !page.customCSS.trim() ? 'outline outline-2 outline-offset-2 outline-black' : ''}`}
                  aria-pressed={!ownHTML && !page.customCSS.trim()}
                  disabled={busy}
                  onClick={() => chooseTheme(null)}
                >
                  <span aria-hidden="true" className="block w-full p-3 border border-black/20 thread-surface">
                    <span className="block p-2 bg-thread-paper border border-thread-sage/40">
                      <span className="block text-base leading-tight thread-headline">The site&apos;s look</span>
                      <span className="block text-xs mt-1">No theme</span>
                    </span>
                  </span>
                  <span className="block text-sm font-semibold mt-1 text-nb-ink">No theme</span>
                  <span className="block text-xs text-nb-ink-mid">The notebook look everyone starts with</span>
                </button>
              </li>
            </ul>
            {undo && (
              <p className="mt-3 text-sm text-nb-ink flex flex-wrap items-center gap-3" role="status">
                {undo.label}
                <Button variant="secondary" size="sm" onClick={undoTheme} disabled={busy}>
                  Undo
                </Button>
              </p>
            )}
            {!ownHTML && currentTheme && !themeVars && (
              <p className="mt-3 text-sm text-nb-ink-mid">
                Your theme is an older version. Pick it again to get the colour and font settings below.
              </p>
            )}
          </section>

          {/* Colours and fonts */}
          {!ownHTML && shown && (
            <section aria-labelledby="your-page-knobs">
              <h3 id="your-page-knobs" className="text-lg font-bold mb-1 text-nb-ink">Colours and fonts</h3>
              <p className="text-sm text-nb-ink-mid mb-3">Changes show in the preview first. Save to put them on your page.</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm text-nb-ink">
                  Accent
                  <span className="flex items-center gap-2 mt-1">
                    <input
                      type="color"
                      value={shown.accent}
                      onChange={(e) => setKnobs({ ...knobs, accent: e.target.value })}
                      className="h-10 w-14 border border-black p-0.5 bg-white"
                    />
                    <span className="font-mono text-xs">{shown.accent}</span>
                  </span>
                </label>
                <label className="block text-sm text-nb-ink">
                  Page background
                  <span className="flex items-center gap-2 mt-1">
                    <input
                      type="color"
                      value={/^#[0-9a-f]{6}$/i.test(shown.ground) ? shown.ground : '#ffffff'}
                      onChange={(e) => setKnobs({ ...knobs, ground: e.target.value })}
                      className="h-10 w-14 border border-black p-0.5 bg-white"
                    />
                    <span className="font-mono text-xs">{shown.ground}</span>
                  </span>
                </label>
                <label className="block text-sm text-nb-ink sm:col-span-2">
                  Background image (optional)
                  <input
                    type="url"
                    inputMode="url"
                    placeholder="https://…"
                    value={knobs.groundImage || ''}
                    onChange={(e) => setKnobs({ ...knobs, groundImage: e.target.value || undefined })}
                    className="block w-full mt-1 border border-black p-2 bg-white"
                  />
                  <span className="text-xs text-nb-ink-mid">A link to an image that starts with https://. It covers the page behind your cards.</span>
                </label>
                <label className="block text-sm text-nb-ink">
                  Heading font
                  <select
                    value={shown.fontHead}
                    onChange={(e) => setKnobs({ ...knobs, fontHead: e.target.value })}
                    className="block w-full mt-1 border border-black p-2 bg-white"
                  >
                    {!FONT_CHOICES.some((f) => f.stack === shown.fontHead) && <option value={shown.fontHead}>The theme&apos;s font</option>}
                    {FONT_CHOICES.map((f) => (
                      <option key={f.stack} value={f.stack}>{f.label}</option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm text-nb-ink">
                  Body font
                  <select
                    value={shown.fontBody}
                    onChange={(e) => setKnobs({ ...knobs, fontBody: e.target.value })}
                    className="block w-full mt-1 border border-black p-2 bg-white"
                  >
                    {!FONT_CHOICES.some((f) => f.stack === shown.fontBody) && <option value={shown.fontBody}>The theme&apos;s font</option>}
                    {FONT_CHOICES.map((f) => (
                      <option key={f.stack} value={f.stack}>{f.label}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                <Button onClick={() => saveKnobs(knobs)} disabled={busy || !knobsChanged}>
                  {busy ? 'Saving...' : 'Save'}
                </Button>
                {knobsChanged && (
                  <Button variant="secondary" onClick={() => setKnobs(savedKnobs)} disabled={busy}>
                    Discard changes
                  </Button>
                )}
                {!knobsChanged && Object.keys(savedKnobs).length > 0 && (
                  <Button variant="secondary" onClick={() => saveKnobs({})} disabled={busy}>
                    Back to the theme&apos;s own
                  </Button>
                )}
              </div>
            </section>
          )}

          {/* Widgets */}
          {!ownHTML && (
            <section aria-labelledby="your-page-widgets">
              <h3 id="your-page-widgets" className="text-lg font-bold mb-1 text-nb-ink">Under your header</h3>
              <p className="text-sm text-nb-ink-mid mb-3">A sticky note, your song or a few buttons, on your page as it is.</p>
              <WidgetSlotPicker />
            </section>
          )}

          {/* Tabs */}
          {!ownHTML && (
            <section aria-labelledby="your-page-tabs">
              <h3 id="your-page-tabs" className="text-lg font-bold mb-1 text-nb-ink">Tabs</h3>
              <p className="text-sm text-nb-ink-mid mb-3">Blog always shows. Untick the ones you don&apos;t use.</p>
              <ul className="flex flex-wrap gap-x-6 gap-y-2 list-none p-0 m-0">
                {HIDEABLE_TABS.map((tab) => (
                  <li key={tab.id}>
                    <label className="flex items-center gap-2 text-sm text-nb-ink min-h-[44px]">
                      <input
                        type="checkbox"
                        checked={!page.hiddenTabs.includes(tab.id)}
                        disabled={busy}
                        onChange={(e) => toggleTab(tab.id, !e.target.checked)}
                      />
                      {tab.label}
                    </label>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Do it yourself */}
          <section aria-labelledby="your-page-diy" className="border-t border-dotted border-nb-ink-mid/60 pt-6">
            <h3 id="your-page-diy" className="text-lg font-bold mb-1 text-nb-ink">Do it yourself</h3>
            <ul className="text-sm text-nb-ink space-y-2 list-none p-0 m-0">
              <li>
                <Link href={`/resident/${encodeURIComponent(username)}/css-editor`}>Edit the CSS yourself</Link>
                <span className="text-nb-ink-mid">. Your theme&apos;s CSS is already in there to change.</span>
              </li>
              <li>
                <Link href={`/resident/${encodeURIComponent(username)}/template-editor`}>Write your own HTML page</Link>
                <span className="text-nb-ink-mid">. Paste a page you already have, or start from one of ours.</span>
              </li>
            </ul>
          </section>
        </div>

        {/* Preview */}
        <section aria-labelledby="your-page-preview" className="lg:sticky lg:top-4 min-w-0">
          <div className="flex items-baseline justify-between gap-2 mb-2">
            <h3 id="your-page-preview" className="text-lg font-bold text-nb-ink m-0">Your page</h3>
            <Link href={`/resident/${encodeURIComponent(username)}`} className="text-sm">
              Open it
            </Link>
          </div>
          <iframe
            key={previewKey}
            ref={previewRef}
            src={`/resident/${encodeURIComponent(username)}`}
            title="Your page"
            onLoad={applyPreviewKnobs}
            className="block w-full h-[28rem] lg:h-[40rem] border-2 border-black bg-white"
          />
        </section>
      </div>
    </div>
  );
}
