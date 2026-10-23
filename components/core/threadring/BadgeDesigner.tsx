import React, { useEffect, useState } from 'react';
import BadgeSelector from '@/components/shared/BadgeSelector';
import BadgeUpload from '@/components/ui/media/BadgeUpload';
import Button from '@/components/ui/Button';
import { useToast } from '@/contexts/ToastContext';
import { csrfFetch } from '@/lib/api/client/csrf-fetch';
import { badgeChoiceFor, type BadgeChoice } from '@/lib/rings/badge-art';
import { ringBadgePalette } from '@/lib/rings/theme';

type BadgeUrls = { badgeImageUrl: string; badgeImageHighResUrl: string };

interface BadgeDesignerProps {
  /** themeColor: the ring's colour, which a drawn badge is in */
  ring: { slug: string; name: string; themeColor?: string | null };
  onSaved?: (badge: BadgeUrls) => void;
}

function BadgeImage({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="flex items-end gap-4 flex-wrap">
      <img src={src} alt={alt} width={88} height={31} style={{ imageRendering: 'pixelated' }} />
      <img src={src} alt={`${alt}, twice the size`} width={176} height={62} style={{ imageRendering: 'pixelated' }} />
    </div>
  );
}

/**
 * Change a ring's badge: one drawn from a style, picture and words in the
 * ring's colour, or an image of the Host's own. Loads the ring's badge and
 * saves to Ring Hub itself, which also updates the badge every member has.
 */
export default function BadgeDesigner({ ring, onSaved }: BadgeDesignerProps) {
  const { showSuccess, showError } = useToast();
  const [current, setCurrent] = useState<string | null>(null);
  const [mode, setMode] = useState<'design' | 'upload'>('design');
  const [choice, setChoice] = useState<Partial<BadgeChoice>>({});
  const [uploaded, setUploaded] = useState<BadgeUrls | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/threadrings/${encodeURIComponent(ring.slug)}/badge`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setCurrent(data?.badge?.imageUrl ?? null);
        // A badge we drew opens on its own choices
        if (data?.badge?.choice) setChoice(data.badge.choice);
      })
      .catch(() => {});
  }, [ring.slug]);

  const send = async (url: string, method: string, body: unknown) => {
    const res = await csrfFetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Couldn't save the badge. Try again.");
    return data;
  };

  const save = async () => {
    if (mode === 'upload' && !uploaded) {
      showError('Pick an image first.');
      return;
    }
    setSaving(true);
    try {
      const base = `/api/threadrings/${encodeURIComponent(ring.slug)}`;
      const urls: BadgeUrls =
        mode === 'upload' && uploaded ? uploaded : await send(`${base}/generate-and-upload-badge`, 'POST', badgeChoiceFor(choice));
      const result = await send(`${base}/update-badge`, 'PUT', { ...urls, updateExistingBadges: true });
      setCurrent(urls.badgeImageUrl);
      // The hub sends how many members' badges it redrew, as a number
      const updated = typeof result.badgesUpdated === 'number' ? result.badgesUpdated : 0;
      showSuccess(`Badge updated.${updated > 0 ? ` ${updated} member badges regenerated.` : ''}`);
      onSaved?.({ badgeImageUrl: urls.badgeImageUrl, badgeImageHighResUrl: urls.badgeImageHighResUrl });
    } catch (error) {
      showError(error instanceof Error ? error.message : "Couldn't save the badge. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {current && (
        <section>
          <h3 className="font-bold text-lg mb-3">Current badge</h3>
          <BadgeImage src={current} alt={`${ring.name} badge`} />
        </section>
      )}

      <div className="flex gap-2 flex-wrap" role="group" aria-label="Kind of badge">
        <Button variant={mode === 'design' ? 'primary' : 'secondary'} aria-pressed={mode === 'design'} onClick={() => setMode('design')}>
          Use a template
        </Button>
        <Button variant={mode === 'upload' ? 'primary' : 'secondary'} aria-pressed={mode === 'upload'} onClick={() => setMode('upload')}>
          Upload your own image
        </Button>
      </div>

      {mode === 'design' ? (
        <div className="space-y-2">
          <p className="text-sm text-gray-600">It&apos;s drawn in the ring&apos;s theme colour.</p>
          <BadgeSelector
            value={choice}
            onChange={setChoice}
            name={ring.name}
            slug={ring.slug}
            palette={ringBadgePalette(ring.themeColor, ring.slug)}
          />
        </div>
      ) : (
        <div className="space-y-4">
          {uploaded && <BadgeImage src={uploaded.badgeImageUrl} alt="Your image as a badge" />}
          <BadgeUpload ringSlug={ring.slug} onUploadingChange={setUploading} onUploadSuccess={setUploaded} disabled={saving} />
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <Button onClick={save} disabled={saving || uploading}>
          {saving ? 'Saving...' : uploading ? 'Uploading...' : 'Save badge'}
        </Button>
        <p className="text-sm text-gray-600">Saving changes the badge every member has too.</p>
      </div>
    </div>
  );
}
