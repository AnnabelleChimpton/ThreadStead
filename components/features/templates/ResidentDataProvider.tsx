import React, { createContext, useContext } from 'react';
import type { ComponentCSSRenderMode } from '@/lib/utils/css/css-mode-mapper';
import type { PageHome } from '@/lib/templates/page-home';

export interface ResidentData {
  owner: {
    id: string;
    handle: string;
    displayName: string;
    avatarUrl?: string;
  };
  viewer: {
    id: string | null;
    isFriend?: boolean;
    isFollowing?: boolean;
    isFollower?: boolean;
    /** The viewer blocked the owner, so `posts` is empty on purpose. */
    blockedOwner?: boolean;
  };
  posts: Array<{
    id: string;
    bodyHtml: string;
    createdAt: string;
  }>;
  guestbook: Array<{
    id: string;
    message: string;
    authorUsername?: string;
    createdAt: string;
  }>;
  relationships?: object;
  capabilities?: {
    bio?: string;
    [key: string]: any;
  };
  featuredFriends?: Array<{
    id: string;
    handle: string;
    displayName: string;
    avatarUrl: string;
  }>;
  websites?: Array<{
    id: string;
    label: string;
    url: string;
    blurb?: string;
    /** "This is my site": linked with rel="me" */
    mine?: boolean;
  }>;
  images?: Array<{
    id: string;
    url: string;
    alt?: string;
    caption?: string;
    createdAt: string;
  }>;
  profileImages?: Array<{
    id: string;
    url: string;
    alt?: string;
    type: 'avatar' | 'banner' | 'gallery';
  }>;
  badges?: Array<{
    id: string;
    title: string;
    subtitle?: string;
    imageUrl?: string;
    templateId?: string;
    backgroundColor: string;
    textColor: string;
    threadRing: {
      id: string;
      name: string;
      slug: string;
    };
  }>;
  // CSS configuration for template components
  cssRenderMode?: ComponentCSSRenderMode;
  /** The owner's profile song, for <ProfileMusic /> */
  profileMidi?: {
    url: string;
    title?: string;
    /** The owner's credit line for the song */
    credit?: string | null;
    autoplay?: boolean;
    loop?: boolean;
  };
  /** The owner's pixel home, for <MyHouse /> <HouseBadge /> <RingNav />: null = none, left out = not loaded */
  pixelHome?: PageHome | null;
}

const ResidentDataContext = createContext<ResidentData | null>(null);

interface ResidentDataProviderProps {
  data: ResidentData;
  children: React.ReactNode;
}

export function ResidentDataProvider({ data, children }: ResidentDataProviderProps) {
  return (
    <ResidentDataContext.Provider value={data}>
      {children}
    </ResidentDataContext.Provider>
  );
}

// The action/event system unwraps this provider by name; minified function
// names break that in production without an explicit displayName.
ResidentDataProvider.displayName = 'ResidentDataProvider';

export function useResidentData(): ResidentData {
  const context = useContext(ResidentDataContext);
  if (!context) {
    throw new Error('useResidentData must be used within a ResidentDataProvider');
  }
  return context;
}

export function useResidentCSSRenderMode(): ComponentCSSRenderMode | undefined {
  const context = useContext(ResidentDataContext);
  return context?.cssRenderMode;
}