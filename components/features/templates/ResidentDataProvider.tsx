import React, { createContext, useContext } from 'react';
import type { ComponentCSSRenderMode } from '@/lib/utils/css/css-mode-mapper';

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