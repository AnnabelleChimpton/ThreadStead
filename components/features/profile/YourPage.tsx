/**
 * Settings > Your page: the light way to make a profile yours, without
 * opening a code editor. Three doors up top (pick a theme, write your own
 * HTML page, add components), then the theme cards (one click, saved,
 * undoable), colour and font knobs, widgets under the header and hidden
 * tabs, with the real page changing beside it. The CSS editor is a link at
 * the bottom.
 *
 * With your own HTML page on, the knobs are the page's own theme options
 * (`<meta name="color:Accent" content="#c96633">`): saving rewrites those
 * values in the page's source through the HTML editor's save route, so
 * History keeps the old version and the page recompiles.
 *
 * Themes and knobs: lib/templates/appearance.ts. Theme options:
 * lib/templates/compilation/theme-options.ts. Widgets: WidgetSlotPicker.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/feedback/LoadingSpinner';
import WidgetSlotPicker from '@/components/features/profile/WidgetSlotPicker';
import ThemeSwatch from '@/components/features/profile/ThemeSwatch';
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
} from '@/lib/templates/appearance';
import { PRESET_FONT_FACES } from '@/lib/templates/preset-fonts';
import { scopeAwayFromSiteChrome, transformAdvancedCss } from '@/lib/utils/css/css-transform';
import {
  fontFamilies,
  optionKey,
  scanThemeOptions,
  themeOptionsCss,
  writeThemeOptions,
  type ThemeOption,
} from '@/lib/templates/compilation/theme-options';
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
const OPTIONS_PREVIEW_STYLE_ID = 'your-page-preview-options';

/** What a colour input can show for a theme option's colour (#rrggbb only). */
function colorInputValue(value: string): string {
  const v = value.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(v)) return v;
  if (/^#[0-9a-f]{8}$/.test(v)) return v.slice(0, 7);
  if (/^#[0-9a-f]{3,4}$/.test(v)) return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`;
  // rgb(), hsl() and names: let the browser work it out
  try {
    const ctx = typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null;
    if (ctx) {
      ctx.fillStyle = '#000000';
      ctx.fillStyle = v;
      if (/^#[0-9a-f]{6}$/i.test(String(ctx.fillStyle))) return String(ctx.fillStyle);
    }
  } catch {
    // no canvas: fall through
  }
  return '#000000';
}

interface Door {
  title: string;
  text: string;
  href: string;
}

// The three ways in, by what you want to do. No time estimates or skill
// labels. With your own HTML page on, the HTML and components doors both go
// to the HTML editor (its component list is open there), and themes would
// switch you back to the standard layout.
function doorsFor(username: string, ownHTML: boolean): Door[] {
  const htmlEditor = `/resident/${encodeURIComponent(username)}/template-editor`;
  return ownHTML
    ? [
        { title: 'Pick a theme', text: 'Go back to the standard layout with one of ours. Your HTML page stays in History.', href: '#your-page-theme' },
        { title: 'Edit your HTML page', text: 'Your page is your own HTML. Change it in the HTML editor.', href: htmlEditor },
        { title: 'Add components', text: 'The HTML editor lists them all. Click one to drop it into your page.', href: htmlEditor },
      ]
    : [
        { title: 'Pick a theme', text: 'Choose a look for your page, then change its colours and fonts.', href: '#your-page-theme' },
        { title: 'Write your own HTML page', text: 'Paste a page you already have, or start from one of ours. A short lesson opens alongside.', href: `${htmlEditor}?learn=make-it-yours&step=1` },
        { title: 'Add components', text: 'Put widgets like a sticky note or your song under your header.', href: '#your-page-widgets' },
      ];
}

const DOOR_CLASS =
  'block h-full p-3 border-2 border-black bg-white no-underline hover:bg-thread-cream focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2';
// Settings' own link styles underline every link and win over the utility
const DOOR_STYLE = { textDecoration: 'none' } as const;

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
  // Your own HTML page: its source, and unsaved theme option values by optionKey
  const [source, setSource] = useState<string | null>(null);
  const [optionDraft, setOptionDraft] = useState<Record<string, string>>({});
  const [optionsUndo, setOptionsUndo] = useState<string | null>(null);

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

  const loadSource = useCallback(async () => {
    try {
      const res = await fetch(`/api/profile/${encodeURIComponent(username)}/template`);
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setSource(typeof data.template === 'string' ? data.template : '');
    } catch {
      setSource(null);
    }
    setOptionDraft({});
  }, [username]);

  useEffect(() => {
    if (ownHTML) loadSource();
  }, [ownHTML, loadSource]);

  const pageOptions = useMemo(() => (ownHTML && source ? scanThemeOptions(source).options : []), [ownHTML, source]);
  const shownOptions: ThemeOption[] = useMemo(
    () => pageOptions.map((o) => ({ ...o, value: optionDraft[optionKey(o)] ?? o.value })),
    [pageOptions, optionDraft]
  );
  const optionsChanged = shownOptions.some((o, i) => o.value !== pageOptions[i].value);

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

  // Unsaved theme option values, as the live page will write them (pages/_app.tsx)
  const applyPreviewOptions = useCallback(() => {
    const doc = previewRef.current?.contentDocument;
    if (!doc?.head) return;
    let style = doc.getElementById(OPTIONS_PREVIEW_STYLE_ID);
    if (!style) {
      style = doc.createElement('style');
      style.id = OPTIONS_PREVIEW_STYLE_ID;
      doc.head.appendChild(style);
    }
    style.textContent = optionsChanged ? escapeCssForStyleTag(transformAdvancedCss(themeOptionsCss(shownOptions))) : '';
  }, [shownOptions, optionsChanged]);

  useEffect(() => {
    applyPreviewOptions();
  }, [applyPreviewOptions]);

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
          "Themes style the standard profile layout. Your HTML page and its CSS go into History in the HTML editor, so you can load them back any time.",
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

  // The HTML editor's own save: History keeps what this replaces, and the page recompiles
  async function saveTemplate(template: string) {
    const res = await csrfFetch(`/api/profile/${encodeURIComponent(username)}/template`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ template }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : 'template');
  }

  async function saveOptions() {
    if (source === null || busy) return;
    setBusy(true);
    const previous = source;
    try {
      const values = Object.fromEntries(shownOptions.map((o) => [optionKey(o), o.value]));
      await saveTemplate(writeThemeOptions(previous, values));
      await loadSource();
      setPreviewKey((k) => k + 1);
      setOptionsUndo(previous);
      showSuccess('Saved.');
    } catch (error) {
      showError(error instanceof Error && error.message !== 'template' ? error.message : "Couldn't save. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function undoOptions() {
    if (optionsUndo === null || busy) return;
    setBusy(true);
    try {
      await saveTemplate(optionsUndo);
      await loadSource();
      setPreviewKey((k) => k + 1);
      setOptionsUndo(null);
      showSuccess('Put back.');
    } catch {
      showError("Couldn't undo that. Your old page is in the HTML editor's History.");
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
          {/* Doors */}
          <nav aria-label="Ways to change your page">
            <ul className="grid gap-3 sm:grid-cols-3 list-none p-0 m-0">
              {doorsFor(username, ownHTML).map((door) => (
                <li key={door.title}>
                  {door.href.startsWith('#') ? (
                    <a href={door.href} className={DOOR_CLASS} style={DOOR_STYLE}>
                      <span className="block font-semibold text-nb-ink">{door.title}</span>
                      <span className="block text-sm text-nb-ink-mid mt-1">{door.text}</span>
                    </a>
                  ) : (
                    <Link href={door.href} className={DOOR_CLASS} style={DOOR_STYLE}>
                      <span className="block font-semibold text-nb-ink">{door.title}</span>
                      <span className="block text-sm text-nb-ink-mid mt-1">{door.text}</span>
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>

          {/* Theme */}
          <section aria-labelledby="your-page-theme">
            <h3 id="your-page-theme" className="text-lg font-bold mb-1 text-nb-ink scroll-mt-24">Theme</h3>
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
                      <ThemeSwatch vars={theme.vars} name={theme.name} line={theme.description} />
                      <span className="block text-sm font-semibold mt-1 text-nb-ink">
                        {theme.name}
                        {on && <span className="font-normal text-nb-ink-mid"> (on)</span>}
                      </span>
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
                  <span className="block text-xs text-nb-ink-mid">The site&apos;s own notebook look.</span>
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

          {/* Your own HTML page's theme options */}
          {ownHTML && pageOptions.length > 0 && (
            <section aria-labelledby="your-page-options">
              <h3 id="your-page-options" className="text-lg font-bold mb-1 text-nb-ink">Colours and fonts</h3>
              <p className="text-sm text-nb-ink-mid mb-3">
                Your page&apos;s HTML sets these. Changes show in the preview first. Save to put them on your page.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                {shownOptions.map((option, i) => {
                  const key = optionKey(option);
                  const set = (value: string) => setOptionDraft({ ...optionDraft, [key]: value });
                  if (option.type === 'color') {
                    return (
                      <label key={key} className="block text-sm text-nb-ink min-w-0">
                        {option.name}
                        <span className="flex items-center gap-2 mt-1">
                          <input
                            type="color"
                            value={colorInputValue(option.value)}
                            onChange={(e) => set(e.target.value)}
                            className="h-10 w-14 border border-black p-0.5 bg-white"
                          />
                          <span className="font-mono text-xs break-all">{option.value}</span>
                        </span>
                      </label>
                    );
                  }
                  const saved = pageOptions[i].value;
                  return (
                    <label key={key} className="block text-sm text-nb-ink min-w-0">
                      {option.name}
                      <select
                        value={option.value}
                        onChange={(e) => set(e.target.value)}
                        className="block w-full mt-1 border border-black p-2 bg-white"
                      >
                        {!FONT_CHOICES.some((f) => f.stack === saved) && (
                          <option value={saved}>Your page&apos;s font ({fontFamilies(saved)[0]})</option>
                        )}
                        {FONT_CHOICES.map((f) => (
                          <option key={f.stack} value={f.stack}>{f.label}</option>
                        ))}
                      </select>
                    </label>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                <Button onClick={saveOptions} disabled={busy || !optionsChanged}>
                  {busy ? 'Saving...' : 'Save'}
                </Button>
                {optionsChanged && (
                  <Button variant="secondary" onClick={() => setOptionDraft({})} disabled={busy}>
                    Discard changes
                  </Button>
                )}
                {!optionsChanged && optionsUndo !== null && (
                  <Button variant="secondary" onClick={undoOptions} disabled={busy}>
                    Undo
                  </Button>
                )}
              </div>
            </section>
          )}

          {/* Widgets */}
          {!ownHTML && (
            <section aria-labelledby="your-page-widgets">
              <h3 id="your-page-widgets" className="text-lg font-bold mb-1 text-nb-ink scroll-mt-24">Under your header</h3>
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
              {ownHTML && source !== null && pageOptions.length === 0 && (
                <li>
                  <Link href="/build/what-works-here#theme-options">Add colour and font settings</Link>
                  <span className="text-nb-ink-mid">. A few lines in your HTML put pickers here.</span>
                </li>
              )}
              <li>
                <Link href="/build/templates/components">Every component</Link>
                <span className="text-nb-ink-mid">. What each one does, with a snippet to copy into your HTML.</span>
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
            onLoad={() => {
              applyPreviewKnobs();
              applyPreviewOptions();
            }}
            className="block w-full h-[28rem] lg:h-[40rem] border-2 border-black bg-white"
          />
        </section>
      </div>
    </div>
  );
}
