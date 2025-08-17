// Data fetching utilities for template system
import type { ResidentData } from '@/components/template/ResidentDataProvider';

export interface UserProfile {
  did: string;
  userId: string;
  username: string;
  primaryHandle: string | null;
  profile: {
    displayName?: string;
    bio?: string;
    avatarUrl?: string;
    [key: string]: any;
  } | null;
  plugins: Array<{
    id: string;
    mode: string;
    label: any;
  }>;
}

export interface UserPosts {
  posts: Array<{
    id: string;
    content: string;
    contentHtml: string;
    createdAt: string;
    visibility: string;
    author: {
      id: string;
      primaryHandle: string | null;
      profile: {
        displayName: string | null;
      } | null;
    };
  }>;
}

export interface GuestbookEntries {
  entries: Array<{
    id: string;
    profileOwner: string;
    authorId: string | null;
    authorUsername: string | null;
    message: string;
    createdAt: string;
    status: string;
  }>;
}

// Fetch user profile data
export async function fetchUserProfile(username: string): Promise<UserProfile | null> {
  try {
    console.log('Fetching profile for username:', username);
    const response = await fetch(`/api/profile/${encodeURIComponent(username)}`);
    console.log('Profile API response status:', response.status);
    
    if (!response.ok) {
      if (response.status === 404) {
        console.log('Profile not found for user');
        return null;
      }
      throw new Error(`Profile fetch failed: ${response.status}`);
    }
    const result = await response.json();
    console.log('Profile fetched successfully:', result);
    return result;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
}

// Fetch user posts
export async function fetchUserPosts(username: string): Promise<UserPosts> {
  try {
    console.log('Fetching posts for username:', username);
    const response = await fetch(`/api/posts/${encodeURIComponent(username)}`);
    console.log('Posts API response status:', response.status);
    
    if (!response.ok) {
      if (response.status === 404) {
        console.log('Posts not found for user, returning empty array');
        return { posts: [] };
      }
      throw new Error(`Posts fetch failed: ${response.status}`);
    }
    const result = await response.json();
    console.log('Posts fetched successfully:', result);
    return result;
  } catch (error) {
    console.error('Error fetching user posts:', error);
    return { posts: [] };
  }
}

// Fetch guestbook entries
export async function fetchGuestbookEntries(username: string): Promise<GuestbookEntries> {
  try {
    console.log('Fetching guestbook for username:', username);
    const response = await fetch(`/api/guestbook/${encodeURIComponent(username)}`);
    console.log('Guestbook API response status:', response.status);
    
    if (!response.ok) {
      if (response.status === 404) {
        console.log('Guestbook not found for user, returning empty array');
        return { entries: [] };
      }
      throw new Error(`Guestbook fetch failed: ${response.status}`);
    }
    const result = await response.json();
    console.log('Guestbook fetched successfully:', result);
    return result;
  } catch (error) {
    console.error('Error fetching guestbook entries:', error);
    return { entries: [] };
  }
}

// Fetch current user info
export async function fetchCurrentUser(): Promise<{ loggedIn: boolean; user?: any } | null> {
  try {
    const response = await fetch('/api/auth/me');
    if (!response.ok) {
      throw new Error(`User fetch failed: ${response.status}`);
    }
    const result = await response.json();
    console.log('Current user data:', result);
    return result;
  } catch (error) {
    console.error('Error fetching current user:', error);
    return null;
  }
}

// Fetch all resident data for a user
export async function fetchResidentData(username: string): Promise<ResidentData | null> {
  try {
    console.log('fetchResidentData starting for username:', username);
    
    // Fetch all data in parallel but handle errors individually
    const [profileResult, postsResult, guestbookResult, currentUserResult] = await Promise.allSettled([
      fetchUserProfile(username),
      fetchUserPosts(username),
      fetchGuestbookEntries(username),
      fetchCurrentUser()
    ]);

    // Extract results from Promise.allSettled
    const profile = profileResult.status === 'fulfilled' ? profileResult.value : null;
    const posts = postsResult.status === 'fulfilled' ? postsResult.value : { posts: [] };
    const guestbook = guestbookResult.status === 'fulfilled' ? guestbookResult.value : { entries: [] };
    const currentUser = currentUserResult.status === 'fulfilled' ? currentUserResult.value : null;

    console.log('Data fetch results:', { profile, posts, guestbook, currentUser });

    if (!profile) {
      console.log('Profile not found, returning null');
      return null; // User not found
    }

    // Transform the data to match ResidentData interface
    const residentData: ResidentData = {
      owner: {
        id: profile.userId,
        handle: profile.username,
        displayName: profile.profile?.displayName || profile.username,
        avatarUrl: profile.profile?.avatarUrl
      },
      viewer: {
        id: currentUser?.loggedIn ? currentUser.user?.id || null : null
      },
      posts: posts.posts.map(post => ({
        id: post.id,
        contentHtml: post.contentHtml,
        createdAt: post.createdAt
      })),
      guestbook: guestbook.entries.map(entry => ({
        id: entry.id,
        message: entry.message,
        authorUsername: entry.authorUsername || undefined,
        createdAt: entry.createdAt
      })),
      relationships: {}, // TODO: Add relationship data if needed
      capabilities: {
        bio: profile.profile?.bio || undefined,
        ...profile.profile // Include other profile fields
      }
    };

    return residentData;
  } catch (error) {
    console.error('Error fetching resident data:', error);
    return null;
  }
}

// For the test page - get current logged-in user's data
export async function fetchCurrentUserResidentData(): Promise<ResidentData | null> {
  try {
    const currentUser = await fetchCurrentUser();
    console.log('fetchCurrentUserResidentData - current user:', currentUser);
    
    if (!currentUser?.loggedIn || !currentUser.user?.primaryHandle) {
      console.log('User not logged in or no primary handle');
      return null;
    }

    const username = currentUser.user.primaryHandle;
    console.log('Using username for data fetch:', username);
    const result = await fetchResidentData(username);
    console.log('fetchCurrentUserResidentData - result:', result);
    
    if (!result) {
      console.log('fetchResidentData returned null, user profile not found');
      // Return null so the calling code can fall back to mock data
      return null;
    }
    
    return result;
  } catch (error) {
    console.error('Error fetching current user resident data:', error);
    return null;
  }
}