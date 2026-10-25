import { useContext, useEffect, useState, useMemo, useRef } from 'react';
import type { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import { PixelIcon } from '@/components/ui/PixelIcon';
import ResidentHtmlBody from '@/components/core/profile/ResidentHtmlBody';
import ProfileLayout from '@/components/ui/layout/ProfileLayout';
import { ResidentDataProvider } from '@/components/features/templates/ResidentDataProvider';
import RetroCard from '@/components/ui/layout/RetroCard';
import ProfileHeader from '@/components/core/profile/ProfileHeader';
import Tabs, { TabSpec } from '@/components/ui/navigation/Tabs';
import BlogTab from '@/components/core/profile/tabs/BlogTab';
import MediaGrid from '@/components/core/profile/tabs/MediaGrid';
import FriendsWebsitesGrid from '@/components/core/profile/tabs/FriendsWebsitesGrid';
import ProfileBadgeDisplay from '@/components/core/profile/ProfileBadgeDisplay';
import Guestbook from '@/components/shared/Guestbook';
import { cleanCss, escapeCssForStyleTag } from '@/lib/utils/sanitization/css';
import { advancedPageCss, standardPageCss } from '@/lib/templates/rendering/page-css';
import { isPageArtifact, renderArtifact } from '@/lib/templates/rendering/page-artifact';
import type { PreviewPayload } from '@/lib/templates/editor/preview-payload';
import PageMeta from "@/components/ui/layout/PageMeta";
import { useSiteCSS, SiteCssContext } from '@/hooks/useSiteCSS';
import { pageCSS, siteStylesOn } from '@/lib/domain/profile/layout';

/**
 * The editors' live preview, popup or pane. It renders what the editor sends
 * (PreviewPayload) the way the live page renders a saved page: the artifact
 * pruned for the viewer (renderArtifact), the same page body
 * (ResidentHtmlBody), the same CSS (page-css.ts, after the site's), the same
 * data (/api/profile/[username]/page-data). preview-parity.test.tsx keeps
 * the two the same.
 */

// The preview runs either as a popup (window.opener) or embedded in the
// editor as an iframe (window.parent). Same protocol either way.
function getHostWindow(): Window | null {
  if (typeof window === 'undefined') return null;
  if (window.opener && !window.opener.closed) return window.opener;
  if (window.parent && window.parent !== window) return window.parent;
  return null;
}

export default function TemplatePreview() {
  const router = useRouter();
  const [payload, setPayload] = useState<PreviewPayload | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ text: string; ok: boolean } | null>(null);
  // Embedded in the editor's preview pane: the editor chrome already labels
  // and saves things, so the bar would just be noise.
  const isEmbedded = router.query.embed === '1';
  // The site's CSS as _app has it (sent once with the page), as the live page has it
  const { css: siteCss } = useSiteCSS({ initialCSS: useContext(SiteCssContext), skipDOMInjection: true });

  // This effect must arm exactly ONCE. Its old deps ([isReady, previewData])
  // re-ran it on every received message, and the unconditional PREVIEW_READY
  // it posts turned the handshake into an infinite READY -> DATA -> READY
  // ping-pong with the host — a full preview re-render per cycle, pegging a
  // CPU core for as long as the editor stayed open. The retry reads state
  // through a ref instead of the closure so it never needs deps.
  const hasDataRef = useRef(false);
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Only from this site
      if (event.origin !== window.location.origin) return;
      if (event.data.type === 'PREVIEW_DATA') {
        hasDataRef.current = true;
        setPayload(event.data.payload);
      }
      if (event.data.type === 'CSS_UPDATE') {
        setPayload((prev) => (prev ? { ...prev, customCSS: event.data.customCSS } : null));
      }
    };
    window.addEventListener('message', handleMessage);

    // Tell the host (popup opener or iframe parent) the preview is ready,
    // every 2 seconds until the first data arrives
    const requestData = () => getHostWindow()?.postMessage({ type: 'PREVIEW_READY' }, window.location.origin);
    requestData();
    const retryInterval = setInterval(() => {
      if (hasDataRef.current || !getHostWindow()) return clearInterval(retryInterval);
      requestData();
    }, 2000);

    return () => {
      window.removeEventListener('message', handleMessage);
      clearInterval(retryInterval);
    };
  }, []);

  // The page as this viewer sees it: an artifact pruned for them, or the
  // owner's page as saved (the CSS editor)
  const page = useMemo(() => {
    if (!payload?.page) return null;
    return isPageArtifact(payload.page) ? renderArtifact(payload.page, { isOwner: payload.as !== 'visitor' }) : payload.page;
  }, [payload?.page, payload?.as]);

  // The page's CSS: the draft, sanitized as a save sanitizes it, else the
  // admin default; built as the live page builds it. The same {__html}
  // objects until it changes (pages/_app.tsx says why).
  const customCSS = payload?.customCSS;
  const adminDefaultCss = payload?.adminDefaultCss;
  const pageCssHtml = useMemo(() => {
    if (customCSS === undefined) return null;
    const css = pageCSS({ customCSS: cleanCss(customCSS) }, adminDefaultCss) ?? '';
    const built = page ? advancedPageCss(css, page) : css.trim() && standardPageCss(css);
    return built ? { __html: escapeCssForStyleTag(built) } : null;
  }, [customCSS, adminDefaultCss, page]);
  const siteCssHtml = useMemo(() => ({ __html: escapeCssForStyleTag(siteCss) }), [siteCss]);

  if (!payload) {
    return (
      <>
        <PageMeta title="Preview" noIndex />
        <div className="min-h-screen flex items-center justify-center bg-thread-cream">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-thread-pine mx-auto mb-4"></div>
            <h1 className="text-xl font-semibold text-thread-pine">Loading the preview…</h1>
          </div>
        </div>
      </>
    );
  }

  const { residentData, cssMode, hideNavigation, template } = payload;
  const username = payload.handle.split('@')[0];
  const siteStyles = siteStylesOn(cssMode);

  // The popup's Save goes through the editor that opened it
  const handleSave = () => {
    const host = getHostWindow();
    if (!host) {
      setSaveMessage({ text: "Can't save. The editor window is closed.", ok: false });
      return;
    }
    setIsSaving(true);
    host.postMessage({
      type: 'SAVE_REQUEST',
      data: { template, customCSS: payload.customCSS, cssMode, hideNavigation, useStandardLayout: !page },
    }, window.location.origin);
    setSaveMessage({ text: 'Saving in the editor', ok: true });
    setTimeout(() => setSaveMessage(null), 3000);
    setIsSaving(false);
  };

  // The site's CSS, then the page's own, as on the live page (pages/_app.tsx)
  const styles = (
    <>
      {siteStyles && <style id="preview-site-css" dangerouslySetInnerHTML={siteCssHtml} />}
      {pageCssHtml && <style id={page ? 'advanced-template-css' : 'profile-page-styles'} dangerouslySetInnerHTML={pageCssHtml} />}
    </>
  );

  // A popup has a bar at the bottom of the window, out of the page's way
  const saveBar = !isEmbedded && (
    <div
      data-site-chrome
      className="fixed bottom-0 left-0 right-0 z-[10000] flex items-center justify-between gap-3 px-4 py-2 text-sm bg-thread-cream border-t-2 border-thread-sage text-nb-ink"
    >
      <span>Preview. It updates as you type in the editor.</span>
      <span className="flex items-center gap-3">
        {saveMessage && (
          <span className="text-xs inline-flex items-center gap-1">
            <PixelIcon name={saveMessage.ok ? 'check' : 'close'} size={12} />{saveMessage.text}
          </span>
        )}
        <button type="button" onClick={handleSave} disabled={isSaving} className="btn btn--primary px-3 py-1 text-xs">
          Save
        </button>
      </span>
    </div>
  );

  if (page) {
    return (
      <>
        <PageMeta title="Preview" noIndex />
        {styles}
        <ResidentHtmlBody
          user={{ id: payload.ownerId, handle: payload.handle, profile: { templateMode: 'advanced', cssMode, compiledTemplate: page } }}
          residentData={residentData}
          hideNavigation={hideNavigation}
          siteStyles={siteStyles}
        />
        {saveBar}
      </>
    );
  }

  // The standard layout: the profile's parts with the CSS on them
  const tabs: TabSpec[] = [
    { id: 'blog', label: 'Blog', content: <BlogTab username={username} ownerUserId={payload.ownerId} /> },
    { id: 'media', label: 'Media', content: <MediaGrid username={username} isOwner={true} /> },
    { id: 'friends', label: 'Friends / Websites', content: <FriendsWebsitesGrid friends={residentData.featuredFriends ?? []} websites={residentData.websites ?? []} /> },
    {
      id: 'badges',
      label: 'Badges',
      content: (
        <div className="profile-tab-content p-4">
          <ProfileBadgeDisplay username={username} showTitle={false} layout="grid" className="max-w-2xl" />
        </div>
      ),
    },
    {
      id: 'guestbook',
      label: 'Guestbook',
      content: (
        <div className="ts-guestbook-tab-content profile-tab-content" data-component="guestbook-tab">
          <Guestbook username={username} bio={residentData.capabilities?.bio ?? ''} />
        </div>
      ),
    },
  ];
  return (
    <>
      <PageMeta title="Preview" noIndex />
      {styles}
      <ResidentDataProvider data={residentData}>
        <ProfileLayout hideNavigation={false} templateMode="enhanced" cssMode={cssMode}>
          <RetroCard>
            <ProfileHeader
              username={username}
              photoUrl={residentData.owner.avatarUrl ?? ''}
              bio={residentData.capabilities?.bio ?? ''}
              relStatus=""
              onRelStatusChange={() => {}}
            />
          </RetroCard>
          <div className="profile-tabs-wrapper">
            <Tabs tabs={tabs} initialId="blog" />
          </div>
        </ProfileLayout>
      </ResidentDataProvider>
      {saveBar}
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async () => ({
  // _app: a profile page, whose site and page CSS this page places itself
  props: { templateMode: 'advanced', siteStyles: false },
});
