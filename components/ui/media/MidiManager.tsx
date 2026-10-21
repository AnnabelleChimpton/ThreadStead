import React, { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { csrfFetch } from '@/lib/api/client/csrf-fetch';
import { useToast } from '@/contexts/ToastContext';
import { useConfirm } from '@/contexts/ConfirmContext';
import Button from '@/components/ui/Button';
import { buttonClasses } from '@/components/ui/ButtonLink';
import LoadingSpinner from '@/components/ui/feedback/LoadingSpinner';
import { PixelIcon } from '@/components/ui/PixelIcon';

// The player is client-only
const MidiPlayer = dynamic(() => import('@/components/ui/media/MidiPlayer'), {
  ssr: false,
  loading: () => <LoadingSpinner layout="row" message="Loading the player…" className="justify-start" />,
});

interface Song {
  id: string;
  title?: string | null;
  /** The credit line: "by …", "arranged from …" */
  caption?: string | null;
  originalName?: string | null;
  fileSize?: number | null;
  createdAt: string;
}

interface MidiManagerProps {
  username: string;
}

const MAX_BYTES = 1024 * 1024;
const songName = (song: Song) => song.title || song.originalName?.replace(/\.midi?$/i, '') || 'Untitled song';

async function capability(kind: 'media' | 'profile'): Promise<string> {
  const res = await fetch(`/api/cap/${kind}`, { method: 'POST' });
  if (!res.ok) throw new Error(res.status === 401 ? 'Sign in again to change your music.' : "Couldn't save that. Try again in a moment.");
  const { token } = await res.json();
  return token;
}

/**
 * Your songs, in Settings → Music (MIDI plan Phase 5): pick the one on your
 * profile (or none), preview each in its own row, give it a title and a
 * credit, and choose whether it starts on its own and repeats. Every change
 * saves as you make it.
 */
export default function MidiManager({ username }: MidiManagerProps) {
  const { showSuccess, showError } = useToast();
  const confirm = useConfirm();
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileSong, setProfileSong] = useState<string | null>(null);
  const [autoplay, setAutoplay] = useState(false);
  const [loop, setLoop] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewing, setPreviewing] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  // Read out after a move, for screen readers
  const [moved, setMoved] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetch(`/api/media/midi/${encodeURIComponent(username)}`).then((r) => (r.ok ? r.json() : Promise.reject())),
      fetch(`/api/profile/${encodeURIComponent(username)}`).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([list, profile]) => {
        if (cancelled) return;
        const files: Song[] = list.files || [];
        setSongs(files);
        const picked = profile?.profile?.profileMidiId ?? null;
        // A song that's gone doesn't count as picked
        setProfileSong(files.some((f) => f.id === picked) ? picked : null);
        setAutoplay(!!profile?.profile?.midiAutoplay);
        setLoop(!!profile?.profile?.midiLoop);
      })
      .catch(() => {
        if (!cancelled) showError("Couldn't load your songs. Try reloading the page.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // showError is stable enough; reloading on it would loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  /** Save the profile's song and its two switches together (one route) */
  const saveProfile = async (next: { song: string | null; autoplay: boolean; loop: boolean }, done: string) => {
    const before = { song: profileSong, autoplay, loop };
    setProfileSong(next.song);
    setAutoplay(next.autoplay);
    setLoop(next.loop);
    setSaving(true);
    try {
      const cap = await capability('profile');
      const res = await csrfFetch('/api/profile/midi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ midiId: next.song, autoplay: next.autoplay, loop: next.loop, cap }),
      });
      if (!res.ok) throw new Error("Couldn't save that. Try again in a moment.");
      showSuccess(done);
    } catch (error) {
      setProfileSong(before.song);
      setAutoplay(before.autoplay);
      setLoop(before.loop);
      showError(error instanceof Error ? error.message : "Couldn't save that. Try again in a moment.");
    } finally {
      setSaving(false);
    }
  };

  const pickSong = (id: string | null) => {
    if (id === profileSong) return;
    const song = songs.find((s) => s.id === id);
    void saveProfile(
      { song: id, autoplay, loop },
      song ? `Your profile plays “${songName(song)}” now.` : 'Your profile has no music now.'
    );
  };

  const upload = async (files: FileList) => {
    setUploading(true);
    try {
      const cap = await capability('media');
      for (const file of Array.from(files)) {
        if (!/\.midi?$/i.test(file.name)) {
          showError(`“${file.name}” isn't a MIDI file (.mid or .midi).`);
          continue;
        }
        if (file.size > MAX_BYTES) {
          showError(`“${file.name}” is over 1 MB.`);
          continue;
        }
        const form = new FormData();
        form.append('file', file);
        form.append('cap', cap);
        form.append('title', file.name.replace(/\.midi?$/i, ''));
        const res = await csrfFetch('/api/media/upload', { method: 'POST', body: form });
        const result = await res.json().catch(() => ({}));
        if (!res.ok) {
          showError(result.error ? `“${file.name}”: ${result.error}` : `Couldn't add “${file.name}”.`);
          continue;
        }
        setSongs((prev) => [
          { id: result.media.id, title: result.media.title, caption: result.media.caption, originalName: file.name, fileSize: file.size, createdAt: result.media.createdAt },
          ...prev,
        ]);
        showSuccess(`Added “${file.name.replace(/\.midi?$/i, '')}”.`);
      }
    } catch (error) {
      showError(error instanceof Error ? error.message : "Couldn't add that. Try again in a moment.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const saveDetails = async (song: Song, title: string, credit: string) => {
    try {
      const cap = await capability('media');
      const res = await csrfFetch(`/api/media/${song.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cap, title: title.trim() || null, caption: credit.trim() || null }),
      });
      if (!res.ok) throw new Error("Couldn't save that. Try again in a moment.");
      const { media } = await res.json();
      setSongs((prev) => prev.map((s) => (s.id === song.id ? { ...s, title: media.title, caption: media.caption } : s)));
      setEditing(null);
      showSuccess('Saved.');
    } catch (error) {
      showError(error instanceof Error ? error.message : "Couldn't save that. Try again in a moment.");
    }
  };

  const remove = async (song: Song) => {
    const onProfile = song.id === profileSong;
    const ok = await confirm({
      title: `Delete “${songName(song)}”?`,
      message: onProfile
        ? "It's the song on your profile, so your page will go quiet. This can't be undone."
        : "This can't be undone.",
      confirmText: 'Delete',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      const cap = await capability('media');
      const res = await csrfFetch(`/api/media/${song.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cap }),
      });
      if (!res.ok) throw new Error("Couldn't delete it. Try again in a moment.");
      setSongs((prev) => prev.filter((s) => s.id !== song.id));
      if (onProfile) setProfileSong(null);
      if (previewing === song.id) setPreviewing(null);
      showSuccess(onProfile ? 'Deleted. Your profile has no music now.' : 'Deleted.');
    } catch (error) {
      showError(error instanceof Error ? error.message : "Couldn't delete it. Try again in a moment.");
    }
  };

  /** Move a song one place up (-1) or down (+1), and save the whole order */
  const move = async (index: number, by: -1 | 1) => {
    const to = index + by;
    if (to < 0 || to >= songs.length) return;
    const before = songs;
    const next = [...songs];
    [next[index], next[to]] = [next[to], next[index]];
    setSongs(next);
    setMoved(`Moved “${songName(next[to])}” to ${to + 1} of ${next.length}.`);
    try {
      const res = await csrfFetch('/api/user/song-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: next.map((s) => s.id) }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setSongs(before);
      showError("Couldn't save the new order. Try again in a moment.");
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading your songs…" className="py-8" />;
  }

  const picked = songs.find((s) => s.id === profileSong) ?? null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept=".mid,.midi,audio/midi"
          multiple
          className="hidden"
          onChange={(e) => e.target.files?.length && upload(e.target.files)}
        />
        <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          {uploading ? 'Adding…' : 'Add a song'}
        </Button>
        <span className="text-sm text-nb-ink-mid">A .mid or .midi file, up to 1 MB. Up to 10 a month.</span>
      </div>

      <fieldset className="m-0 p-0 border-0 min-w-0" disabled={saving}>
        <legend className="font-semibold text-nb-ink mb-2">On your profile</legend>
        {/* Inline margin and padding: site CSS indents lists on phones */}
        <ul className="list-none space-y-2" style={{ margin: 0, padding: 0 }}>
          <li className="border-2 border-nb-ink-mid/30 rounded-md bg-white px-3 py-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="profile-song"
                checked={profileSong === null}
                onChange={() => pickSong(null)}
                className="h-4 w-4 flex-shrink-0 accent-nb-ink"
              />
              <span className="text-nb-ink">No music</span>
            </label>
          </li>
          {songs.map((song, index) => (
            <SongRow
              key={song.id}
              song={song}
              first={index === 0}
              last={index === songs.length - 1}
              onMove={(by) => move(index, by)}
              onProfile={song.id === profileSong}
              previewing={previewing === song.id}
              editing={editing === song.id}
              onPick={() => pickSong(song.id)}
              onPreview={() => setPreviewing(previewing === song.id ? null : song.id)}
              onEdit={() => setEditing(editing === song.id ? null : song.id)}
              onSave={(title, credit) => saveDetails(song, title, credit)}
              onDelete={() => remove(song)}
            />
          ))}
        </ul>
        <p className="sr-only" aria-live="polite">{moved}</p>
        {songs.length === 0 && (
          <p className="mt-3 mb-0 text-sm text-nb-ink-mid">No songs yet. Add a MIDI file and it shows up here.</p>
        )}
      </fieldset>

      {picked && (
        <fieldset className="m-0 p-0 border-0 min-w-0 space-y-3" disabled={saving}>
          <legend className="font-semibold text-nb-ink mb-2">How “{songName(picked)}” plays</legend>
          <label className="flex items-start gap-2 cursor-pointer text-nb-ink">
            <input
              type="checkbox"
              checked={autoplay}
              onChange={(e) =>
                saveProfile(
                  { song: profileSong, autoplay: e.target.checked, loop },
                  e.target.checked ? "Your song starts on a visitor's first click now." : 'Your song waits for visitors to press Play now.'
                )
              }
              className="mt-1 h-4 w-4 flex-shrink-0 accent-nb-ink"
            />
            <span>
              Start it when someone visits
              <span className="block text-sm text-nb-ink-mid">
                Browsers wait for a visitor&apos;s first click or tap, and anyone who has turned autoplay off still has to press Play.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-2 cursor-pointer text-nb-ink">
            <input
              type="checkbox"
              checked={loop}
              onChange={(e) =>
                saveProfile(
                  { song: profileSong, autoplay, loop: e.target.checked },
                  e.target.checked ? 'Your song plays on repeat now.' : 'Your song plays once now.'
                )
              }
              className="mt-1 h-4 w-4 flex-shrink-0 accent-nb-ink"
            />
            <span>Play it on repeat</span>
          </label>
        </fieldset>
      )}
    </div>
  );
}

interface SongRowProps {
  song: Song;
  first: boolean;
  last: boolean;
  onMove: (by: -1 | 1) => void;
  onProfile: boolean;
  previewing: boolean;
  editing: boolean;
  onPick: () => void;
  onPreview: () => void;
  onEdit: () => void;
  onSave: (title: string, credit: string) => void;
  onDelete: () => void;
}

function SongRow({ song, first, last, onMove, onProfile, previewing, editing, onPick, onPreview, onEdit, onSave, onDelete }: SongRowProps) {
  const [title, setTitle] = useState(song.title ?? '');
  const [credit, setCredit] = useState(song.caption ?? '');
  const name = songName(song);

  useEffect(() => {
    if (editing) {
      setTitle(song.title ?? '');
      setCredit(song.caption ?? '');
    }
  }, [editing, song.title, song.caption]);

  const details = [
    song.fileSize ? `${Math.max(1, Math.round(song.fileSize / 1024))} KB` : null,
    new Date(song.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
  ].filter(Boolean).join(' · ');

  return (
    <li className={`border-2 rounded-md px-3 py-2 ${onProfile ? 'border-nb-ink-mid/60 bg-nb-paper' : 'border-nb-ink-mid/30 bg-white'}`}>
      <div className="flex items-start gap-2">
        <label className="flex flex-1 items-start gap-2 cursor-pointer min-w-0">
          <input type="radio" name="profile-song" checked={onProfile} onChange={onPick} className="mt-1 h-4 w-4 flex-shrink-0 accent-nb-ink" />
          <span className="min-w-0">
            <span className="block font-semibold text-nb-ink break-words">{name}</span>
            {song.caption && <span className="block text-sm text-nb-ink-mid break-words">{song.caption}</span>}
            <span className="block text-xs text-nb-ink-mid">{details}</span>
          </span>
        </label>
        {!(first && last) && (
          // Stacked on phones, so the song's name keeps the room
          <span className="flex flex-col sm:flex-row flex-shrink-0 gap-1">
            <Button variant="secondary" size="sm" onClick={() => onMove(-1)} disabled={first} aria-label={`Move “${name}” up`} title="Move up" className="!px-2">
              <PixelIcon name="chevron-up" size={14} />
            </Button>
            <Button variant="secondary" size="sm" onClick={() => onMove(1)} disabled={last} aria-label={`Move “${name}” down`} title="Move down" className="!px-2">
              <PixelIcon name="chevron-down" size={14} />
            </Button>
          </span>
        )}
      </div>

      {/* Two by two on phones, one row from sm up */}
      <div className="mt-2 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:pl-6">
        <Button variant="secondary" size="sm" onClick={onPreview} aria-expanded={previewing}>
          {previewing ? 'Close preview' : 'Preview'}
        </Button>
        <Button variant="secondary" size="sm" onClick={onEdit} aria-expanded={editing}>
          {editing ? 'Cancel' : 'Edit'}
        </Button>
        <a
          href={`/api/media/serve/${song.id}?download=1`}
          download
          className={buttonClasses('secondary', 'sm', { inline: false })}
          // Inline: the theme's .btn rule for links sets its own display and line-height
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 'inherit' }}
        >
          Download
        </a>
        <Button variant="danger" size="sm" onClick={onDelete}>
          Delete
        </Button>
      </div>

      {editing && (
        <form
          className="mt-3 sm:pl-6 space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            onSave(title, credit);
          }}
        >
          <label className="block text-sm text-nb-ink">
            Title
            <input
              type="text"
              value={title}
              maxLength={100}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 block w-full max-w-md border-2 border-nb-ink-mid/40 rounded px-2 py-1"
            />
          </label>
          <label className="block text-sm text-nb-ink">
            Credit <span className="text-nb-ink-mid">(optional: who wrote it, who sequenced it)</span>
            <input
              type="text"
              value={credit}
              maxLength={200}
              onChange={(e) => setCredit(e.target.value)}
              className="mt-1 block w-full max-w-md border-2 border-nb-ink-mid/40 rounded px-2 py-1"
            />
          </label>
          <p className="m-0 text-xs text-nb-ink-mid">Visitors see the credit when they open the player&apos;s controls.</p>
          <Button type="submit" size="sm">Save</Button>
        </form>
      )}

      {previewing && (
        <div className="mt-3 sm:pl-6 max-w-md">
          <MidiPlayer
            midiUrl={`/api/media/serve/${song.id}`}
            title={name}
            credit={song.caption}
            playNow
            loop={false}
            placement="inline"
          />
        </div>
      )}
    </li>
  );
}
