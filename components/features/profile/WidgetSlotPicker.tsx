// Picking the widgets for the slot under your profile header
// (lib/domain/profile/widget-slot). Each widget is a short form; the server
// writes and compiles the fragment, and the preview is that same compile.
import React from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import { PixelIcon } from '@/components/ui/PixelIcon';
import LoadingSpinner from '@/components/ui/feedback/LoadingSpinner';
import { csrfFetch } from '@/lib/api/client/csrf-fetch';
import { useToast } from '@/contexts/ToastContext';
import { useConfirm } from '@/contexts/ConfirmContext';
import WidgetSlot, { type WidgetSlotContent } from '@/components/core/profile/WidgetSlot';
import { ImageLibrary } from '@/components/features/templates/ImagePicker';
import type { ResidentData } from '@/components/features/templates/ResidentDataProvider';
import {
  MAX_WIDGETS,
  MAX_SLOT_SOURCE_CHARS,
  WIDGETS,
  WIDGET_LIST,
  newWidget,
  type LinkedImage,
  type WidgetField,
  type WidgetInstance,
  type WidgetType,
} from '@/lib/domain/profile/widget-slot/catalog';

interface Resident {
  id: string;
  handle: string;
  displayName: string;
  avatarUrl: string;
  song: { url: string; title: string; autoplay: boolean; loop: boolean } | null;
}

interface LoadedState {
  slot: { widgets: WidgetInstance[] | null; source: string } | null;
  resident: Resident;
  previews: Partial<Record<WidgetType, WidgetSlotContent>>;
}

interface Stripped {
  name: string;
  reason?: string;
}

const INPUT =
  'w-full border-2 border-nb-ink-mid/60 rounded-md px-3 py-2 bg-white text-nb-ink focus:outline-none focus:border-nb-ink-mid';

function residentDataFor(resident: Resident): ResidentData {
  return {
    owner: {
      id: resident.id,
      handle: resident.handle,
      displayName: resident.displayName,
      avatarUrl: resident.avatarUrl,
    },
    viewer: { id: resident.id },
    posts: [],
    guestbook: [],
    ...(resident.song ? { profileMidi: resident.song } : {}),
  };
}

/** Whose images "Choose a picture" opens */
const OwnerContext = React.createContext('');

/**
 * Pick one of your own images (or upload one) for a picture field. Uploads
 * from here are page pictures, not gallery posts; the Media page's route made
 * a public "Featured" post of every 88×31 (template audit 09 G1).
 */
function ChoosePicture({ label = 'Choose a picture', onChoose }: { label?: string; onChoose: (url: string) => void }) {
  const username = React.useContext(OwnerContext);
  const [open, setOpen] = React.useState(false);
  if (!username) return null;
  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 whitespace-nowrap">
        <PixelIcon name="image" size={14} /> {label}
      </Button>
      <ImageLibrary
        isOpen={open}
        username={username}
        onClose={() => setOpen(false)}
        onChoose={(url) => {
          onChoose(url);
          setOpen(false);
        }}
        title="Choose a picture"
        hint="Pick one of your pictures, or upload a new one."
        emptyHint="Upload one and it goes right in."
      />
    </>
  );
}

export default function WidgetSlotPicker({ username = '' }: { username?: string }) {
  const toast = useToast();
  const confirm = useConfirm();

  const [loaded, setLoaded] = React.useState<LoadedState | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  // What's being edited: the forms, or (once edited by hand) the code
  const [widgets, setWidgets] = React.useState<WidgetInstance[]>([]);
  const [handSource, setHandSource] = React.useState<string | null>(null);
  const [savedKey, setSavedKey] = React.useState('');

  const [preview, setPreview] = React.useState<WidgetSlotContent | null>(null);
  const [previewSource, setPreviewSource] = React.useState('');
  const [problem, setProblem] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [stripped, setStripped] = React.useState<Stripped[]>([]);

  const load = React.useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch('/api/user/widget-slot');
      if (!res.ok) throw new Error();
      const data: LoadedState = await res.json();
      setLoaded(data);
      setWidgets(data.slot?.widgets ?? []);
      const hand = data.slot && !data.slot.widgets ? data.slot.source : null;
      setHandSource(hand);
      setSavedKey(editKey(data.slot?.widgets ?? [], hand));
    } catch {
      setLoadError('Your widgets didn’t load. Try again in a moment.');
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const key = editKey(widgets, handSource);
  const dirty = loaded !== null && key !== savedKey;
  const empty = handSource === null ? widgets.length === 0 : handSource.trim() === '';

  // Live preview: the server compiles exactly what Save would store
  React.useEffect(() => {
    if (!loaded) return;
    if (empty) {
      setPreview(null);
      setPreviewSource('');
      setProblem(null);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const res = await csrfFetch('/api/user/widget-slot/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(handSource === null ? { widgets } : { source: handSource }),
          signal: controller.signal,
        });
        const data = await res.json();
        if (!res.ok) {
          setProblem([data.error, data.details].filter(Boolean).join(' '));
          return;
        }
        setProblem(null);
        setPreview(data.compiled);
        setPreviewSource(data.source);
        setStripped(data.strippedComponents ?? []);
      } catch (error) {
        if ((error as Error).name !== 'AbortError') setProblem('The preview didn’t load.');
      }
    }, 400);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
    // `key` covers widgets and handSource
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, loaded, empty]);

  const residentData = React.useMemo(() => (loaded ? residentDataFor(loaded.resident) : null), [loaded]);

  if (loadError) {
    return (
      <div className="thread-module p-4">
        <p className="text-nb-ink mb-3">{loadError}</p>
        <Button variant="secondary" size="sm" onClick={load}>
          Try again
        </Button>
      </div>
    );
  }
  if (!loaded || !residentData) return <LoadingSpinner size="sm" message="Loading your widgets" />;

  const hasSong = !!loaded.resident.song;
  const full = widgets.length >= MAX_WIDGETS;

  const update = (index: number, next: WidgetInstance) =>
    setWidgets((list) => list.map((w, i) => (i === index ? next : w)));
  const move = (index: number, by: -1 | 1) =>
    setWidgets((list) => {
      const to = index + by;
      if (to < 0 || to >= list.length) return list;
      const copy = [...list];
      [copy[index], copy[to]] = [copy[to], copy[index]];
      return copy;
    });
  const remove = (index: number) => setWidgets((list) => list.filter((_, i) => i !== index));
  const add = (type: WidgetType) => setWidgets((list) => (list.length >= MAX_WIDGETS ? list : [...list, newWidget(type)]));

  async function save() {
    setSaving(true);
    try {
      const res = await csrfFetch('/api/user/widget-slot', {
        method: empty ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: empty ? undefined : JSON.stringify(handSource === null ? { widgets } : { source: handSource }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.showError([data.error, data.details].filter(Boolean).join(' '));
        return;
      }
      setSavedKey(key);
      const lost: Stripped[] = data.strippedComponents ?? [];
      setStripped(lost);
      if (lost.length > 0) toast.showWarning(`Saved, but ${lost.map((s) => s.name).join(', ')} didn’t make it. See below.`);
      else toast.showSuccess(empty ? 'Slot emptied.' : 'Saved. It’s on your page now.');
    } catch {
      toast.showError('That didn’t save. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  }

  async function clearAll() {
    const ok = await confirm({
      title: 'Take every widget out?',
      message: 'They come off your page when you save.',
      confirmText: 'Take them out',
      variant: 'danger',
    });
    if (!ok) return;
    setWidgets([]);
    setHandSource(null);
  }

  async function backToForms() {
    const ok = await confirm({
      title: 'Go back to the forms?',
      message:
        widgets.length > 0
          ? 'Your code edits are dropped, and the widgets go back to how the forms have them.'
          : 'Your code edits are dropped. The forms start empty, since this slot was written by hand.',
      confirmText: 'Use the forms',
    });
    if (ok) setHandSource(null);
  }

  return (
    <OwnerContext.Provider value={username}>
      <div className="ts-widget-slot-picker space-y-5">
        {/* The slot as it will look (site colours here; your theme applies on your page) */}
        <div>
          <h4 className="font-semibold text-nb-ink mb-2">Preview</h4>
          {preview && !empty ? (
            <WidgetSlot slot={preview} residentData={residentData} preview="card" />
          ) : (
            <div className="border-2 border-dashed border-nb-ink-mid/50 rounded-md p-6 text-center text-nb-ink-mid">
              Nothing in the slot yet. Add a widget below.
            </div>
          )}
          {problem && (
            <p className="mt-2 text-sm text-nb-rose-ink flex items-start gap-1" role="alert">
              <PixelIcon name="alert" size={16} className="mt-0.5 flex-shrink-0" /> {problem}
            </p>
          )}
          {stripped.length > 0 && (
            <div className="mt-2 text-sm text-nb-ink" role="status">
              <p className="font-semibold">Left out of the slot:</p>
              <ul className="list-disc pl-5">
                {stripped.map((s, i) => (
                  <li key={`${s.name}-${i}`}>
                    {s.name}
                    {s.reason ? `: ${s.reason}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="mt-2 text-sm text-nb-ink-mid">
            Your theme applies on your page.{' '}
            {loaded.resident.handle && <Link href={`/resident/${loaded.resident.handle}`}>See your page</Link>}
          </p>
        </div>

        {/* The widgets in the slot, each with its form */}
        {handSource === null ? (
          widgets.length > 0 && (
            <ol className="space-y-3 list-none p-0 m-0">
              {widgets.map((widget, index) => (
                <WidgetForm
                  key={`${widget.type}-${index}`}
                  widget={widget}
                  index={index}
                  count={widgets.length}
                  hasSong={hasSong}
                  onChange={(next) => update(index, next)}
                  onMove={(by) => move(index, by)}
                  onRemove={() => remove(index)}
                />
              ))}
            </ol>
          )
        ) : (
          <div className="border-2 border-dotted border-nb-ink-mid/60 rounded-md p-4 text-sm text-nb-ink">
            <p className="mb-2">You’re editing the code by hand, so the forms are put away.</p>
            <Button variant="secondary" size="sm" onClick={backToForms}>
              Use the forms again
            </Button>
          </div>
        )}

        {/* Save */}
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={save} disabled={saving || !dirty || (!!problem && !empty)} className="min-h-[44px]">
            {saving ? 'Saving…' : 'Save widgets'}
          </Button>
          {!empty && (
            <Button variant="secondary" onClick={clearAll} className="min-h-[44px]">
              Take them all out
            </Button>
          )}
          <span className="text-sm text-nb-ink-mid" aria-live="polite">
            {dirty ? 'Not saved yet' : ''}
          </span>
        </div>

        {/* The gallery */}
        {handSource === null && (
          <div>
            <h4 className="font-semibold text-nb-ink mb-1">Add a widget</h4>
            <p className="text-sm text-nb-ink-mid mb-3">
              {full ? `That’s ${MAX_WIDGETS}, the most the slot holds.` : `Up to ${MAX_WIDGETS}. They sit side by side, or stacked on a phone.`}
            </p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 list-none p-0 m-0">
              {WIDGET_LIST.map((def) => {
                const blocked = def.needsSong && !hasSong;
                const sample = loaded.previews[def.type];
                return (
                  <li key={def.type} className="border-2 border-nb-ink-mid/40 rounded-md bg-white/60 p-3 flex flex-col gap-2">
                    <div className="flex items-start gap-2">
                      <PixelIcon name={def.icon} size={20} className="mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-semibold text-nb-ink leading-tight">{def.name}</p>
                        <p className="text-sm text-nb-ink-mid">{def.blurb}</p>
                      </div>
                    </div>
                    {sample && !blocked && (
                      <div className="ts-widget-gallery-preview h-36 overflow-hidden flex items-center justify-center pointer-events-none" aria-hidden="true">
                        <WidgetSlot slot={sample} residentData={residentData} preview="bare" />
                      </div>
                    )}
                    {blocked ? (
                      <p className="text-sm text-nb-ink-mid mt-auto">
                        Pick a song in <Link href="/settings?tab=music">Music</Link> first.
                      </p>
                    ) : (
                      <Button variant="secondary" size="sm" onClick={() => add(def.type)} disabled={full} className="mt-auto self-start">
                        Add
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* The fragment itself, for anyone who wants it */}
        <details className="border-2 border-dotted border-nb-ink-mid/60 rounded-md p-3">
          <summary className="cursor-pointer font-semibold text-nb-ink">Edit the code</summary>
          <p className="text-sm text-nb-ink-mid mt-2 mb-2">
            The slot is a small piece of a page, with the same HTML and components as a page of your own. Editing it here puts the forms away.
          </p>
          <textarea
            className={`${INPUT} font-mono text-sm h-48`}
            value={handSource ?? previewSource}
            maxLength={MAX_SLOT_SOURCE_CHARS}
            spellCheck={false}
            aria-label="The slot’s code"
            onChange={(e) => setHandSource(e.target.value)}
          />
        </details>
      </div>
    </OwnerContext.Provider>
  );
}

/** One widget in the slot: its name, its order and its form */
function WidgetForm({
  widget,
  index,
  count,
  hasSong,
  onChange,
  onMove,
  onRemove,
}: {
  widget: WidgetInstance;
  index: number;
  count: number;
  hasSong: boolean;
  onChange: (next: WidgetInstance) => void;
  onMove: (by: -1 | 1) => void;
  onRemove: () => void;
}) {
  const def = WIDGETS[widget.type];
  const set = (fieldKey: string, value: string | LinkedImage[]) =>
    onChange({ ...widget, values: { ...widget.values, [fieldKey]: value } });
  const headingId = `widget-${index}-name`;

  return (
    <li className="border-2 border-nb-ink-mid/50 rounded-md bg-white/70 p-3" aria-labelledby={headingId}>
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <PixelIcon name={def.icon} size={20} />
        <p id={headingId} className="font-semibold text-nb-ink flex-1 min-w-0">
          {def.name}
        </p>
        <div className="flex gap-1">
          <button type="button" className="ts-icon-button p-2" onClick={() => onMove(-1)} disabled={index === 0} aria-label={`Move ${def.name} earlier`}>
            <PixelIcon name="arrow-up" size={16} />
          </button>
          <button type="button" className="ts-icon-button p-2" onClick={() => onMove(1)} disabled={index === count - 1} aria-label={`Move ${def.name} later`}>
            <PixelIcon name="arrow-down" size={16} />
          </button>
          <button type="button" className="ts-icon-button p-2" onClick={onRemove} aria-label={`Take out ${def.name}`}>
            <PixelIcon name="close" size={16} />
          </button>
        </div>
      </div>

      {def.fields.length === 0 && (
        <p className="text-sm text-nb-ink-mid">
          {def.needsSong && !hasSong ? (
            <>
              You have no profile song yet. <Link href="/settings?tab=music">Pick one in Music</Link>.
            </>
          ) : (
            'Nothing to fill in.'
          )}
        </p>
      )}

      <div className="space-y-3">
        {def.fields.map((field) => (
          <Field key={field.key} field={field} id={`widget-${index}-${field.key}`} value={widget.values[field.key]} onChange={(v) => set(field.key, v)} />
        ))}
      </div>
    </li>
  );
}

function Field({
  field,
  id,
  value,
  onChange,
}: {
  field: WidgetField;
  id: string;
  value: string | LinkedImage[] | undefined;
  onChange: (value: string | LinkedImage[]) => void;
}) {
  const text = typeof value === 'string' ? value : '';
  const label = (
    <label htmlFor={id} className="block text-sm font-semibold text-nb-ink mb-1">
      {field.label}
    </label>
  );
  const hint = field.hint && <p className="text-xs text-nb-ink-mid mt-1">{field.hint}</p>;

  if (field.type === 'images') {
    return <ImagesField field={field} id={id} items={Array.isArray(value) ? value : []} onChange={onChange} />;
  }
  if (field.type === 'choice') {
    return (
      <div>
        {label}
        <select id={id} className={INPUT} value={text} onChange={(e) => onChange(e.target.value)}>
          {field.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    );
  }
  if (field.type === 'textarea') {
    return (
      <div>
        {label}
        <textarea id={id} className={`${INPUT} h-24`} value={text} maxLength={field.maxLength} onChange={(e) => onChange(e.target.value)} />
        <p className="text-xs text-nb-ink-mid mt-1 text-right">
          {text.length}/{field.maxLength}
        </p>
      </div>
    );
  }
  return (
    <div>
      {label}
      <div className="flex gap-2 items-center">
        <input
          id={id}
          type={field.type === 'url' ? 'url' : 'text'}
          inputMode={field.type === 'url' ? 'url' : undefined}
          className={INPUT}
          value={text}
          placeholder={field.placeholder}
          maxLength={field.type === 'text' ? field.maxLength : 2000}
          onChange={(e) => onChange(e.target.value)}
        />
        {field.type === 'url' && field.picture && <ChoosePicture onChoose={onChange} />}
      </div>
      {hint}
    </div>
  );
}

function ImagesField({
  field,
  id,
  items,
  onChange,
}: {
  field: Extract<WidgetField, { type: 'images' }>;
  id: string;
  items: LinkedImage[];
  onChange: (value: LinkedImage[]) => void;
}) {
  const rows = items.length > 0 ? items : [{ image: '', link: '' }];
  const setRow = (i: number, next: LinkedImage) => onChange(rows.map((r, j) => (j === i ? next : r)));
  return (
    <fieldset>
      <legend className="block text-sm font-semibold text-nb-ink mb-1">{field.label}</legend>
      <p className="text-xs text-nb-ink-mid mb-2">An image link for each button (88×31 pixels), and where it goes if you like.</p>
      <ol className="space-y-2 list-none p-0 m-0">
        {rows.map((row, i) => (
          <li key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr_auto] gap-2 items-center">
            <input
              id={i === 0 ? id : undefined}
              type="url"
              inputMode="url"
              className={INPUT}
              placeholder="Button image, https://…"
              aria-label={`Button ${i + 1} image`}
              value={row.image}
              onChange={(e) => setRow(i, { ...row, image: e.target.value })}
            />
            <ChoosePicture label="Choose" onChoose={(url) => setRow(i, { ...row, image: url })} />
            <input
              type="url"
              inputMode="url"
              className={INPUT}
              placeholder="Goes to (optional)"
              aria-label={`Button ${i + 1} link`}
              value={row.link}
              onChange={(e) => setRow(i, { ...row, link: e.target.value })}
            />
            <button
              type="button"
              className="ts-icon-button p-2 justify-self-start"
              onClick={() => onChange(rows.filter((_, j) => j !== i))}
              aria-label={`Take out button ${i + 1}`}
            >
              <PixelIcon name="close" size={16} />
            </button>
          </li>
        ))}
      </ol>
      {rows.length < field.maxItems && (
        <Button variant="secondary" size="sm" className="mt-2" onClick={() => onChange([...rows, { image: '', link: '' }])}>
          Another button
        </Button>
      )}
    </fieldset>
  );
}

/** Compares what's being edited with what was saved */
function editKey(widgets: WidgetInstance[], handSource: string | null): string {
  return handSource === null ? JSON.stringify(widgets) : `source:${handSource}`;
}
