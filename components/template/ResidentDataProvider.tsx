import React, { createContext, useContext } from 'react';

export interface ResidentData {
  owner: {
    id: string;
    handle: string;
    displayName: string;
    avatarUrl?: string;
  };
  viewer: {
    id: string | null;
  };
  posts: Array<{
    id: string;
    contentHtml: string;
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