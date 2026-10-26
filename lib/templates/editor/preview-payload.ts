// What the editors send the preview (pages/template-preview.tsx), popup or
// pane: the page as stored, never a shape of its own, so it renders through
// the same artifact, body, CSS and data as the live page.
import type { ResidentData } from '@/components/features/templates/ResidentDataProvider';
import type { PageArtifact, PageForRender } from '@/lib/templates/rendering/page-artifact';
import type { PreviewViewer } from '@/lib/templates/core/template-data';

export interface PreviewPayload {
  ownerId: string;
  handle: string;
  /**
   * A page of your own HTML: the draft's artifact (the compile route's), or
   * the saved page as the owner sees it (the CSS editor). Null: the standard layout.
   */
  page: PageArtifact | PageForRender | null;
  /** Whose view of an artifact: the owner's or a signed-out visitor's */
  as: PreviewViewer;
  residentData: ResidentData;
  customCSS: string;
  /** Worn when the page has no CSS of its own, as on the live page */
  adminDefaultCss: string;
  cssMode: 'inherit' | 'override' | 'disable';
  hideNavigation: boolean;
  /** The source, for the popup's Save */
  template: string;
  /** Words on the preview: the page's words can be changed in place (words-preview.ts) */
  words?: boolean;
}
