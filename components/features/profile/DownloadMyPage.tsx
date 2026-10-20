import React, { useState } from 'react';
import Button from '@/components/ui/Button';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { useToast } from '@/contexts/ToastContext';

/** The file name the route sends, from Content-Disposition */
function fileNameFrom(header: string | null): string {
  const match = header?.match(/filename="([^"]+)"/);
  return match?.[1] || 'my-page.zip';
}

/**
 * Settings, Your page: a zip of your page to keep (GET /api/user/export/page,
 * lib/domain/profile/page-download.ts).
 */
export default function DownloadMyPage() {
  const { showError } = useToast();
  const [busy, setBusy] = useState(false);

  const download = async () => {
    setBusy(true);
    try {
      const response = await fetch('/api/user/export/page');
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        showError(typeof body?.error === 'string' ? body.error : "Couldn't make the download. Try again in a bit.");
        return;
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileNameFrom(response.headers.get('Content-Disposition'));
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      showError("Couldn't make the download. Try again in a bit.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border-2 border-dotted border-nb-ink-mid/60 rounded-md p-4">
      <h4 className="font-semibold text-nb-ink mb-2 flex items-center gap-2">
        <PixelIcon name="download" /> Download my page
      </h4>
      <p className="text-sm text-nb-ink mb-3">
        A zip of your page&apos;s HTML and CSS, with the pictures you uploaded for it.
      </p>
      <Button variant="secondary" size="sm" onClick={download} disabled={busy} className="min-h-[48px]">
        <PixelIcon name="download" /> {busy ? 'Getting it ready' : 'Download my page'}
      </Button>
    </div>
  );
}
