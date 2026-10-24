// The editor's preview data: the owner's page data as the live page builds it
// (pages/api/profile/[username]/page-data.ts), as they see it or as a
// signed-out visitor does.
import type { ResidentData } from '@/components/features/templates/ResidentDataProvider';

export type PreviewViewer = 'owner' | 'visitor';

export interface PreviewPageData {
  residentData: ResidentData;
  /** The admin's default CSS, which a page without its own wears */
  adminDefaultCss: string;
}

export async function fetchPageData(username: string, as: PreviewViewer = 'owner'): Promise<PreviewPageData | null> {
  try {
    const res = await fetch(`/api/profile/${encodeURIComponent(username)}/page-data${as === 'visitor' ? '?as=visitor' : ''}`);
    return res.ok ? ((await res.json()) as PreviewPageData) : null;
  } catch {
    return null;
  }
}
