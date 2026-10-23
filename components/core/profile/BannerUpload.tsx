/**
 * Settings > Profile: the banner across the top of your profile. Pick an
 * image and it saves straight away (cropped to 3:1 on the server), or take
 * it off. Posts to /api/profile/upload-banner.
 */
import React, { useRef, useState } from 'react';
import Button from '@/components/ui/Button';
import { csrfFetch } from '@/lib/api/client/csrf-fetch';
import { requestCapability } from '@/lib/api/client/capability';
import { useToast } from '@/contexts/ToastContext';

export default function BannerUpload({ initialUrl }: { initialUrl?: string | null }) {
  const { showSuccess, showError } = useToast();
  const [url, setUrl] = useState<string | null>(initialUrl || null);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setBusy(true);
    try {
      const form = new FormData();
      form.append('banner', file);
      form.append('cap', await requestCapability('profile'));
      const res = await csrfFetch('/api/profile/upload-banner', { method: 'POST', body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't save the banner. Try again.");
      setUrl(data.bannerUrl);
      showSuccess('Banner saved.');
    } catch (error) {
      showError(error instanceof Error ? error.message : "Couldn't save the banner. Try again.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  }

  async function remove() {
    setBusy(true);
    try {
      const cap = await requestCapability('profile');
      const res = await csrfFetch(`/api/profile/upload-banner?cap=${encodeURIComponent(cap)}`, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't remove the banner. Try again.");
      setUrl(null);
      showSuccess('Banner removed.');
    } catch (error) {
      showError(error instanceof Error ? error.message : "Couldn't remove the banner. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="font-bold text-black mb-1">Banner</p>
      <p className="text-sm text-nb-ink-mid mb-3">
        A wide picture across the top of your profile. It&apos;s cropped to 3 wide by 1 tall.
      </p>
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="Your banner" className="block w-full max-w-xl aspect-[3/1] object-cover border-2 border-black mb-3" />
      )}
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => input.current?.click()} disabled={busy}>
          {busy ? 'Saving...' : url ? 'Change banner' : 'Add a banner'}
        </Button>
        {url && (
          <Button variant="secondary" onClick={remove} disabled={busy}>
            Remove
          </Button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload(file);
        }}
      />
    </div>
  );
}
