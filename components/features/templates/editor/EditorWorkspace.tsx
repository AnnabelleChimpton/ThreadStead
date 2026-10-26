import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { EditorView } from '@codemirror/view';
import Button from '@/components/ui/Button';
import { PixelIcon } from '@/components/ui/PixelIcon';

/**
 * The page editors' shell (HTML editor and CSS editor): one toolbar row,
 * tabs on the left, the live preview on the right with a divider you drag.
 * On a laptop it fills the window under the nav (Layout `workspace`) and
 * each side scrolls on its own; phones stack and the preview pops out.
 */

function readStored<T extends string | number>(key: string, fallback: T, ok: (v: string) => boolean): T {
  try {
    const v = window.localStorage.getItem(key);
    if (v !== null && ok(v)) return (typeof fallback === 'number' ? Number(v) : v) as T;
  } catch { /* private window: use the default */ }
  return fallback;
}

function store(key: string, value: string | number) {
  try { window.localStorage.setItem(key, String(value)); } catch { /* not remembered, that's all */ }
}

// ── Code panes: wrap and text size ──

export type CodePane = 'html' | 'css';

const TEXT_SIZES = [11, 12, 13, 14, 15, 16, 18, 20];
const SIZE_KEY = 'ts-editor-text-size';
const wrapKey = (pane: CodePane) => `ts-editor-wrap-${pane}`;

/**
 * Line wrap for each code pane and one text size for both, remembered like
 * the split. HTML wraps until you turn it off and CSS doesn't; on a phone
 * both wrap and the text starts bigger.
 */
export function useCodeSettings() {
  const [wrap, setWrapState] = useState<Record<CodePane, boolean>>({ html: true, css: false });
  const [size, setSize] = useState(13);
  useEffect(() => {
    const phone = window.matchMedia?.('(max-width: 639px)').matches ?? false;
    const stored = (pane: CodePane, fallback: boolean) =>
      readStored(wrapKey(pane), String(fallback), (v) => v === 'true' || v === 'false') === 'true';
    setWrapState({ html: stored('html', true), css: stored('css', phone) });
    setSize(readStored(SIZE_KEY, phone ? 15 : 13, (v) => TEXT_SIZES.includes(Number(v))));
  }, []);
  const setWrap = useCallback((pane: CodePane, on: boolean) => {
    store(wrapKey(pane), String(on));
    setWrapState((current) => ({ ...current, [pane]: on }));
  }, []);
  const resize = useCallback((by: 1 | -1) => {
    const next = TEXT_SIZES[Math.min(TEXT_SIZES.length - 1, Math.max(0, TEXT_SIZES.indexOf(size) + by))];
    store(SIZE_KEY, next);
    setSize(next);
  }, [size]);
  return { wrap, size, setWrap, resize };
}

/** Wrap lines, and A− / A+, in a code pane's row of tools */
export function CodeSettings({ pane, settings }: { pane: CodePane; settings: ReturnType<typeof useCodeSettings> }) {
  const { wrap, size, setWrap, resize } = settings;
  return (
    <span className="inline-flex items-center gap-3">
      <label className="inline-flex items-center gap-1.5 cursor-pointer">
        <input type="checkbox" checked={wrap[pane]} onChange={(e) => setWrap(pane, e.target.checked)} className="h-4 w-4" />
        Wrap lines
      </label>
      <span role="group" aria-label={`Text size: ${size}px`} className="inline-flex items-center gap-1">
        <Button variant="secondary" size="sm" aria-label="Smaller text" disabled={size === TEXT_SIZES[0]} onClick={() => resize(-1)}>
          A−
        </Button>
        <Button variant="secondary" size="sm" aria-label="Bigger text" disabled={size === TEXT_SIZES[TEXT_SIZES.length - 1]} onClick={() => resize(1)}>
          A+
        </Button>
      </span>
    </span>
  );
}

/**
 * Tidy (More): the pane's code re-indented (lib/templates/editor/tidy.ts,
 * loaded now) as one edit, so Undo puts it back. Whether anything changed.
 */
export async function tidyCode(view: EditorView, pane: CodePane): Promise<boolean> {
  const { tidyHtml, tidyCss } = await import('@/lib/templates/editor/tidy');
  const before = view.state.doc.toString();
  const after = (pane === 'html' ? tidyHtml : tidyCss)(before);
  if (after === before) return false;
  view.dispatch({ changes: { from: 0, to: before.length, insert: after } });
  return true;
}

/** What the editors say after Tidy */
export const tidyNote = (changed: boolean): SaveNote =>
  changed ? { text: 'Tidied. Undo puts it back.', tone: 'note' } : { text: "It's already tidy.", tone: 'note' };

/**
 * Find, Undo and Redo, for phones, where there's no keyboard for them. On
 * the code you're looking at; CodeMirror's commands load when first pressed.
 */
export function PhoneCodeTools({ view }: { view: () => EditorView | null }) {
  const run = async (action: 'find' | 'undo' | 'redo') => {
    const target = view();
    if (!target) return;
    if (action === 'find') (await import('@codemirror/search')).openSearchPanel(target);
    else (await import('@codemirror/commands'))[action](target);
  };
  return (
    <span className="inline-flex items-center gap-1">
      <Button variant="secondary" size="sm" className="ts-icon-only" aria-label="Find" onClick={() => run('find')}>
        <PixelIcon name="search" size={14} />
      </Button>
      <Button variant="secondary" size="sm" className="ts-icon-only" aria-label="Undo" onClick={() => run('undo')}>
        <PixelIcon name="undo" size={14} />
      </Button>
      <Button variant="secondary" size="sm" className="ts-icon-only" aria-label="Redo" onClick={() => run('redo')}>
        <PixelIcon name="redo" size={14} />
      </Button>
    </span>
  );
}

// ── Toolbar ──

/**
 * On a laptop everything sits in one row: title, then the save note, Share,
 * History, More and Save. On a phone the row keeps only the title and More,
 * Share and Save go in a bar stuck to the bottom of the screen, and History
 * moves into More (see PhoneOnly).
 */
export function EditorToolbar({ title, handle, status, message, share, laptopOnly, phoneTools, save, children }: {
  title: string;
  handle: string;
  status?: React.ReactNode;
  /** What the last save did */
  message?: React.ReactNode;
  /** "Share this update in the feed" */
  share?: React.ReactNode;
  /** Buttons that are in More on a phone */
  laptopOnly?: React.ReactNode;
  /** In the bar at the bottom of a phone's screen, before Save (PhoneCodeTools) */
  phoneTools?: React.ReactNode;
  save: React.ReactNode;
  /** The More menu */
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-nowrap sm:flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 bg-thread-paper border-b-2 border-thread-sage flex-shrink-0">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 min-w-0 flex-1 sm:flex-initial">
        {/* Inline size: the site's phone rules for h1 outrank utilities */}
        <h1 className="m-0 leading-tight" style={{ fontSize: '1.125rem' }}>{title}</h1>
        <span className="hidden sm:inline text-sm text-nb-ink-mid">@{handle}</span>
        {status}
      </div>
      <div className="ml-auto flex flex-wrap items-center gap-2 flex-shrink-0 sm:flex-shrink">
        {/* Phones: stuck to the bottom of the screen. Laptops: its parts sit
            in this row, in order around History and More */}
        <div className="ts-editor-actions fixed inset-x-0 bottom-0 z-30 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 bg-thread-paper border-t-2 border-thread-sage px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] sm:static sm:contents">
          {message && <div className="flex items-center basis-full sm:basis-auto sm:order-1">{message}</div>}
          {share && <div className="flex items-center sm:order-2">{share}</div>}
          {phoneTools && <div className="flex items-center sm:hidden">{phoneTools}</div>}
          <div className="flex items-center ml-auto sm:ml-0 sm:order-5">{save}</div>
        </div>
        {laptopOnly && <div className="hidden sm:flex sm:order-3 items-center gap-2">{laptopOnly}</div>}
        <div className="flex items-center sm:order-4">{children}</div>
      </div>
    </div>
  );
}

export type SaveState = 'saved' | 'saving' | 'error' | 'pending';

/** A short message after saving or loading. ok and error get an icon; warn and note are plain text. */
export type SaveNote = { text: string; tone: 'ok' | 'error' | 'warn' | 'note' };

export function SaveNoteText({ note }: { note: SaveNote }) {
  const ink = note.tone === 'error' || note.tone === 'warn' ? 'text-thread-sunset' : 'text-nb-ink';
  return (
    <span className={`inline-flex items-center gap-1 text-sm ${ink}`}>
      {note.tone === 'ok' && <PixelIcon name="check" size={12} className="shrink-0" />}
      {note.tone === 'error' && <PixelIcon name="close" size={12} className="shrink-0" />}
      <span>{note.text}</span>
    </span>
  );
}

export function SaveStatus({ state }: { state: SaveState }) {
  return (
    <span role="status" className="inline-flex items-center gap-1 text-xs text-nb-ink-mid">
      {state === 'saved' && <><PixelIcon name="check" size={12} /><span>Saved</span></>}
      {state === 'saving' && <><span className="animate-spin inline-flex"><PixelIcon name="reload" size={12} /></span><span>Saving…</span></>}
      {state === 'error' && <><PixelIcon name="close" size={12} /><span className="text-thread-sunset">Couldn&apos;t save</span></>}
      {state === 'pending' && <><span aria-hidden="true" className="inline-block w-2 h-2 rounded-full bg-thread-sunset" /><span>Unsaved</span></>}
    </span>
  );
}

/** "More": the things you need now and then (reset, view source, settings) */
export function EditorMenu({ children }: { children: (close: () => void) => React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const id = useId();
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <Button
        variant="secondary"
        size="sm"
        className="inline-flex items-center gap-1"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(v => !v)}
      >
        More <PixelIcon name={open ? 'chevron-up' : 'chevron-down'} size={12} />
      </Button>
      {open && (
        <div
          id={id}
          className="ts-editor-menu absolute right-0 top-full mt-1 z-50 w-72 max-w-[calc(100vw-2rem)] bg-thread-paper border-2 border-thread-sage shadow-[3px_3px_0_rgba(46,75,63,0.25)] p-2 flex flex-col gap-1 text-sm text-nb-ink"
        >
          {children(close)}
        </div>
      )}
    </div>
  );
}

/** A row in the More menu */
export function MenuItem({ onClick, href, children, newTab }: {
  onClick?: () => void;
  href?: string;
  newTab?: boolean;
  children: React.ReactNode;
}) {
  const cls = 'ts-bare w-full text-left px-2 py-1.5 rounded-sm hover:bg-thread-cream inline-flex items-center gap-2 text-nb-ink no-underline';
  if (href) {
    return (
      // Inline: the site's link underline outranks utilities
      <a className={cls} style={{ textDecoration: 'none' }} href={href} {...(newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
        {children}
      </a>
    );
  }
  return <button type="button" className={cls} onClick={onClick}>{children}</button>;
}

/** More-menu rows for phones only: on a laptop they're on screen already */
export function PhoneOnly({ children }: { children: React.ReactNode }) {
  return (
    <div className="sm:hidden flex flex-col gap-1">
      {children}
      <hr className="my-1 border-thread-sage/40" />
    </div>
  );
}

// ── Tabs + split ──

export interface WorkspaceTab {
  id: string;
  label: React.ReactNode;
  content: React.ReactNode;
  /** A code editor: fills the pane's height instead of scrolling */
  fill?: boolean;
}

const SPLIT_KEY = 'threadstead:editor-split';
const MIN_LEFT = 380;
const MIN_RIGHT = 340;

export default function EditorWorkspace({ toolbar, notices, tabs, activeTab, onTabChange, tabsEnd, preview }: {
  toolbar: React.ReactNode;
  notices?: React.ReactNode;
  tabs: WorkspaceTab[];
  activeTab: string;
  onTabChange: (id: string) => void;
  /** Links at the end of the tab strip */
  tabsEnd?: React.ReactNode;
  /** The preview pane; null when it's hidden */
  preview?: React.ReactNode;
}) {
  const splitRef = useRef<HTMLDivElement | null>(null);
  // Share of the width the left side gets
  const [split, setSplit] = useState(0.45);
  const [dragging, setDragging] = useState(false);
  useEffect(() => {
    setSplit(readStored(SPLIT_KEY, 0.45, (v) => Number(v) > 0.15 && Number(v) < 0.85));
  }, []);

  const clampSplit = useCallback((fraction: number) => {
    const width = splitRef.current?.getBoundingClientRect().width ?? 0;
    if (!width) return fraction;
    const min = MIN_LEFT / width;
    const max = 1 - MIN_RIGHT / width;
    return min > max ? 0.5 : Math.min(Math.max(fraction, min), max);
  }, []);

  const onPointerMove = useCallback((e: PointerEvent) => {
    const rect = splitRef.current?.getBoundingClientRect();
    if (!rect) return;
    setSplit(clampSplit((e.clientX - rect.left) / rect.width));
  }, [clampSplit]);

  useEffect(() => {
    if (!dragging) return;
    const stop = () => setDragging(false);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', stop);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', stop);
    };
  }, [dragging, onPointerMove]);

  // Remember where it was left
  useEffect(() => {
    if (!dragging) store(SPLIT_KEY, split.toFixed(3));
  }, [dragging, split]);

  // Keep the open tab in view when the row scrolls sideways
  const tabRowRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const row = tabRowRef.current;
    if (!row || row.scrollWidth <= row.clientWidth) return;
    const tab = row.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!tab) return;
    const left = tab.offsetLeft - row.offsetLeft;
    if (left < row.scrollLeft || left + tab.offsetWidth > row.scrollLeft + row.clientWidth) {
      row.scrollLeft = left - 16;
    }
  }, [activeTab]);

  const tabIds = tabs.map((t) => t.id);
  const onTabKey = (e: React.KeyboardEvent) => {
    const i = tabIds.indexOf(activeTab);
    if (e.key === 'ArrowRight') onTabChange(tabIds[(i + 1) % tabIds.length]);
    if (e.key === 'ArrowLeft') onTabChange(tabIds[(i - 1 + tabIds.length) % tabIds.length]);
  };

  return (
    <div className="editor-workspace flex flex-col flex-1 min-h-0 bg-thread-paper">
      {toolbar}
      {notices}

      <div ref={splitRef} className="flex-1 min-h-0 flex flex-col lg:flex-row">
        <section
          className="flex flex-col min-w-0 lg:min-h-0"
          style={preview ? { flex: `0 0 ${(split * 100).toFixed(2)}%` } : { flex: '1 1 auto' }}
        >
          <div className="flex flex-wrap items-end gap-x-1 px-3 bg-thread-cream border-b border-thread-sage flex-shrink-0">
            {/* Phones: one row that scrolls sideways */}
            <div
              ref={tabRowRef}
              role="tablist"
              aria-label="Editor"
              className="ts-tab-row flex flex-nowrap overflow-x-auto max-w-full sm:flex-wrap sm:overflow-visible"
              onKeyDown={onTabKey}
            >
              {tabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  id={`editor-tab-${t.id}`}
                  aria-selected={t.id === activeTab}
                  aria-controls={`editor-panel-${t.id}`}
                  tabIndex={t.id === activeTab ? 0 : -1}
                  className="ts-tab text-sm"
                  onClick={() => onTabChange(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
            {/* Phones: these links are in More */}
            {tabsEnd && <div className="ml-auto hidden sm:flex flex-wrap items-center gap-x-3 py-1.5 text-sm">{tabsEnd}</div>}
          </div>

          {tabs.map((t) => (
            // Every panel stays mounted: the components and generators tabs
            // insert into a code editor that has to still be there
            <div
              key={t.id}
              role="tabpanel"
              id={`editor-panel-${t.id}`}
              aria-labelledby={`editor-tab-${t.id}`}
              hidden={t.id !== activeTab}
              className={
                t.id !== activeTab
                  ? 'hidden'
                  : t.fill
                    ? 'flex flex-col h-[70vh] min-h-[360px] lg:h-auto lg:min-h-0 lg:flex-1'
                    : 'lg:flex-1 lg:min-h-0 overflow-auto'
              }
            >
              {t.content}
            </div>
          ))}
        </section>

        {preview && (
          <>
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="Drag to resize the preview"
              aria-valuenow={Math.round(split * 100)}
              aria-valuemin={15}
              aria-valuemax={85}
              tabIndex={0}
              className="hidden lg:block w-2 flex-shrink-0 cursor-col-resize bg-thread-sage/40 hover:bg-thread-sage focus-visible:bg-thread-sage border-x border-thread-sage"
              onPointerDown={(e) => { e.preventDefault(); setDragging(true); }}
              onDoubleClick={() => setSplit(clampSplit(0.45))}
              onKeyDown={(e) => {
                if (e.key === 'ArrowLeft') setSplit((s) => clampSplit(s - 0.03));
                if (e.key === 'ArrowRight') setSplit((s) => clampSplit(s + 0.03));
              }}
            />
            <section className="hidden lg:flex flex-col flex-1 min-w-0 min-h-0" aria-label="Live preview">
              {preview}
            </section>
          </>
        )}
      </div>

      {/* While dragging, the preview iframe would swallow the pointer */}
      {dragging && <div className="fixed inset-0 z-[60] cursor-col-resize" aria-hidden="true" />}
    </div>
  );
}

// ── Preview ──

const DEVICE_KEY = 'threadstead:editor-preview-device';
const DEVICE_WIDTH = { laptop: 1280, phone: 390 } as const;
type Device = keyof typeof DEVICE_WIDTH;

/**
 * The preview iframe, drawn at a real screen width and scaled to fit, so a
 * narrow pane still shows the laptop layout instead of the phone one.
 */
export function LivePreviewPane({ frameRef, src = '/template-preview?embed=1', status, notice, onPopOut, onHide, viewAs, words }: {
  frameRef: React.MutableRefObject<HTMLIFrameElement | null>;
  src?: string;
  status?: React.ReactNode;
  notice?: React.ReactNode;
  onPopOut?: () => void;
  onHide?: () => void;
  /** Whose view of the page: the owner's, or a signed-out visitor's (IfOwner / IfVisitor, their data) */
  viewAs?: { value: 'owner' | 'visitor'; onChange: (value: 'owner' | 'visitor') => void };
  /** Words on the preview: change the page's words in place (words-preview.ts) */
  words?: { on: boolean; onChange: (on: boolean) => void };
}) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [box, setBox] = useState({ width: 0, height: 0 });
  const [device, setDevice] = useState<Device>('laptop');
  useEffect(() => {
    setDevice(readStored<Device>(DEVICE_KEY, 'laptop', (v) => v === 'laptop' || v === 'phone'));
  }, []);

  useEffect(() => {
    const el = boxRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setBox({ width: Math.floor(width), height: Math.floor(height) });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const pick = (d: Device) => { setDevice(d); store(DEVICE_KEY, d); };

  // On the phone, how wide the page really is: a page wider than the phone
  // makes its visitors scroll sideways, and the preview's scaling hid that
  // (template audit 09 J6). Read from the preview's own document (same site).
  const [phoneWidth, setPhoneWidth] = useState<number | null>(null);
  useEffect(() => {
    if (device !== 'phone') { setPhoneWidth(null); return; }
    const measure = () => {
      const doc = frameRef.current?.contentDocument;
      const root = doc?.querySelector<HTMLElement>('.profile-template-root');
      if (!doc || !root) return;
      const width = Math.max(root.scrollWidth, doc.documentElement.scrollWidth);
      setPhoneWidth(width > DEVICE_WIDTH.phone + 1 ? width : null);
    };
    measure();
    const timer = window.setInterval(measure, 1000);
    return () => window.clearInterval(timer);
  }, [device, frameRef]);

  // Wider than the device: draw at the pane's width, unscaled
  const pageWidth = Math.max(DEVICE_WIDTH[device], device === 'laptop' ? box.width : 0);
  const scale = box.width > 0 ? Math.min(1, box.width / pageWidth) : 1;
  const frameStyle: React.CSSProperties = box.width > 0
    ? {
        width: pageWidth,
        height: box.height / scale,
        transform: scale < 1 ? `scale(${scale})` : undefined,
        transformOrigin: 'top left',
      }
    : { width: '100%', height: '100%' };

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-1.5 bg-thread-cream border-b border-thread-sage flex-shrink-0 text-sm">
        <span className="font-semibold text-nb-ink">Live preview</span>
        <div className="inline-flex gap-1" role="group" aria-label="Preview size">
          {(['laptop', 'phone'] as const).map((d) => (
            <button
              key={d}
              type="button"
              className="ts-chip text-xs"
              aria-pressed={device === d}
              onClick={() => pick(d)}
            >
              {d === 'laptop' ? 'Laptop' : 'Phone'}
            </button>
          ))}
        </div>
        {viewAs && (
          <div className="inline-flex gap-1" role="group" aria-label="See the page as">
            {(['owner', 'visitor'] as const).map((v) => (
              <button key={v} type="button" className="ts-chip text-xs" aria-pressed={viewAs.value === v} onClick={() => viewAs.onChange(v)}>
                {v === 'owner' ? 'As me' : 'As a visitor'}
              </button>
            ))}
          </div>
        )}
        {words && (
          <button
            type="button"
            className="ts-chip text-xs"
            aria-pressed={words.on}
            onClick={() => words.onChange(!words.on)}
            title="Change the words right on the preview. Alt-click anything to find its code."
          >
            Words
          </button>
        )}
        {status && <span className="text-xs text-nb-ink-mid">{status}</span>}
        <div className="ml-auto flex items-center gap-3">
          {onPopOut && (
            <button type="button" className="ts-bare text-xs underline text-nb-ink inline-flex items-center gap-1" onClick={onPopOut} title="Open the preview in its own window">
              <PixelIcon name="external-link" size={12} /> Pop out
            </button>
          )}
          {onHide && (
            <button type="button" className="ts-bare text-xs underline text-nb-ink" onClick={onHide}>
              Hide
            </button>
          )}
        </div>
      </div>
      {notice}
      {phoneWidth && (
        <p role="status" className="m-0 px-3 py-2 text-sm bg-thread-paper border-b border-thread-sage text-nb-ink flex-shrink-0">
          Your page is {phoneWidth}px wide and a phone shows {DEVICE_WIDTH.phone}px, so visitors on phones scroll sideways to see it all.
        </p>
      )}
      <div
        ref={boxRef}
        className={`relative flex-1 min-h-0 overflow-hidden ${device === 'phone' ? 'bg-thread-cream' : 'bg-white'}`}
      >
        <div
          className="absolute top-0 h-full"
          style={device === 'phone' && box.width > pageWidth
            ? { left: Math.floor((box.width - pageWidth) / 2), width: pageWidth }
            : { left: 0, width: '100%' }}
        >
          <iframe
            ref={frameRef}
            src={src}
            title="Live preview of your page"
            className={`block bg-white border-0 ${device === 'phone' ? 'shadow-[0_0_0_2px_rgba(46,75,63,0.35)]' : ''}`}
            style={frameStyle}
          />
        </div>
      </div>
    </>
  );
}

/**
 * The embedded preview's handshake: the iframe posts PREVIEW_READY when it
 * can take data, then gets the editor's state, debounced (every push is a
 * full re-render inside the preview).
 */
export function useEmbeddedPreview({ enabled, hasData, send }: {
  enabled: boolean;
  hasData: boolean;
  send: (target: Window) => void;
}) {
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const frameWin = frameRef.current?.contentWindow;
      if (!frameWin || event.source !== frameWin) return;
      if (event.data?.type === 'PREVIEW_READY') {
        setReady(true);
        if (hasData) send(frameWin);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [hasData, send]);

  useEffect(() => {
    if (!enabled || !ready || !hasData) return;
    const frameWin = frameRef.current?.contentWindow;
    if (!frameWin) return;
    const timer = setTimeout(() => send(frameWin), 400);
    return () => clearTimeout(timer);
  }, [enabled, ready, hasData, send]);

  // The iframe unmounts when the pane closes; forget its readiness
  useEffect(() => {
    if (!enabled) setReady(false);
  }, [enabled]);

  return { frameRef, ready };
}
