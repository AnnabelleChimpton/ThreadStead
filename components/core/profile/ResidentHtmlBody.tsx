// A page of your own HTML with what the site puts around it: the nav (or
// none), the room under it, the page root. The profile page and the editor's
// preview both render this, so the preview's page sits where the live one
// does: the preview drew its own nav, 80px under it and its own container,
// and content landed 9-21px off.
import React from 'react';
import type { ResidentData } from '@/components/features/templates/ResidentDataProvider';
import ProfileModeRenderer, { type ProfileUser } from './ProfileModeRenderer';

export interface ResidentHtmlBodyProps {
  user: ProfileUser;
  residentData: ResidentData;
  /** The page's own setting: no site nav above it */
  hideNavigation: boolean;
  /** The site's own styles on (lib/domain/profile/layout.ts) */
  siteStyles: boolean;
  /** Site chrome under the nav, or at the very top with no nav ("step outside") */
  afterNav?: React.ReactNode;
}

const failed = (
  <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
    <p>Template failed to load</p>
  </div>
);

export default function ResidentHtmlBody({ user, residentData, hideNavigation, siteStyles, afterNav }: ResidentHtmlBodyProps) {
  // No nav, the site's styles on: in the site's column, full bleed (your own
  // page decides its width and margins, as it does with the nav shown; this
  // used to box it at 1024px). A div, not <main>: the page's own `main {}`
  // rules are for its own <main>.
  if (hideNavigation && siteStyles) {
    return (
      <div className="min-h-screen flex flex-col">
        {afterNav}
        <div className="flex-1">
          <ProfileModeRenderer user={user} residentData={residentData} hideNavigation fallbackContent={failed} />
        </div>
      </div>
    );
  }
  // Otherwise nothing around it but the nav, when it has one
  return <ProfileModeRenderer user={user} residentData={residentData} hideNavigation={hideNavigation} afterNav={afterNav} fallbackContent={failed} />;
}
