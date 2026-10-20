import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
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

// ── Toolbar ──

export function EditorToolbar({ title, handle, status, children }: {
  title: string;
  handle: string;
  status?: React.ReactNode;
  /** Right-hand actions, Save last */
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 bg-thread-paper border-b-2 border-thread-sage flex-shrink-0">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 min-w-0">
        {/* Inline size: the site's phone rules for h1 outrank utilities */}
        <h1 className="m-0 leading-tight" style={{ fontSize: '1.125rem' }}>{title}</h1>
        <span className="text-sm text-nb-ink-mid">@{handle}</span>
        {status}
      </div>
      <div className="ml-auto flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

export type SaveState = 'saved' | 'saving' | 'error' | 'pending';

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
          className="absolute right-0 top-full mt-1 z-50 w-72 max-w-[calc(100vw-2rem)] bg-thread-paper border-2 border-thread-sage shadow-[3px_3px_0_rgba(46,75,63,0.25)] p-2 flex flex-col gap-1 text-sm text-nb-ink"
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
            <div role="tablist" aria-label="Editor" className="flex flex-wrap" onKeyDown={onTabKey}>
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
            {tabsEnd && <div className="ml-auto flex flex-wrap items-center gap-x-3 py-1.5 text-sm">{tabsEnd}</div>}
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
export function LivePreviewPane({ frameRef, src = '/template-preview?embed=1', status, notice, onPopOut, onHide }: {
  frameRef: React.MutableRefObject<HTMLIFrameElement | null>;
  src?: string;
  status?: React.ReactNode;
  notice?: React.ReactNode;
  onPopOut?: () => void;
  onHide?: () => void;
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
