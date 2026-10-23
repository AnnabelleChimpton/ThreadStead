import React from "react";
import { PixelIcon } from "@/components/ui/PixelIcon";
import { useToast } from "@/contexts/ToastContext";

/**
 * Under a resident's name: their address is their Bluesky handle, checked
 * against their DID document (lib/domain/bluesky/handle-links.ts). Links to
 * their Bluesky profile, with a button to copy the handle.
 */
export default function BlueskyHandleMark({ handle }: { handle: string }) {
  const { showSuccess, showError } = useToast();

  async function copy() {
    try {
      await navigator.clipboard.writeText(`@${handle}`);
      showSuccess("Handle copied.");
    } catch {
      showError("Couldn't copy it. Select the handle and copy it by hand?");
    }
  }

  return (
    <div className="ts-profile-bluesky mt-1 flex items-center gap-1.5 text-sm flex-wrap">
      <PixelIcon name="check" size={14} />
      <a
        href={`https://bsky.app/profile/${handle}`}
        rel="me noopener noreferrer"
        target="_blank"
        className="ts-profile-bluesky-link"
        title="Their Bluesky handle, checked"
      >
        @{handle}
      </a>
      <span className="ts-profile-bluesky-label text-thread-sage">on Bluesky</span>
      <button
        type="button"
        onClick={copy}
        className="ts-bare ts-profile-bluesky-copy inline-flex items-center p-1 rounded hover:bg-thread-sage/10"
        aria-label={`Copy @${handle}`}
        title="Copy handle"
      >
        <PixelIcon name="copy" size={14} />
      </button>
    </div>
  );
}
