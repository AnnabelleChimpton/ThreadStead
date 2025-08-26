import { db } from './db';

/**
 * Resolve a DID to a local username if the user exists in our ThreadStead instance
 */
export async function resolveDIDToUsername(did: string): Promise<string | null> {
  try {
    // Look up the user by DID in the User table (User.did field)
    const user = await db.user.findFirst({
      where: { did },
      select: {
        primaryHandle: true,
        profile: {
          select: {
            displayName: true
          }
        }
      }
    });

    if (user) {
      // Return display name if available, otherwise primary handle
      return user.profile?.displayName || user.primaryHandle || null;
    }

    return null;
  } catch (error) {
    console.error('Error resolving DID to username:', error);
    return null;
  }
}

/**
 * Extract a readable name from a DID for display purposes
 */
export function extractReadableNameFromDID(did: string, actorName?: string | null): string {
  // If we have an actor name, use it
  if (actorName) {
    return actorName;
  }

  // Handle did:web: format
  if (did.startsWith('did:web:')) {
    const domain = did.replace('did:web:', '');
    // Get the first part of the domain (before first dot)
    const name = domain.split('.')[0] || domain;
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  // For other DID formats, get the last meaningful part
  const parts = did.split(':');
  const lastPart = parts[parts.length - 1] || '';
  
  // If it's a long hex string, truncate it
  if (/^[a-f0-9]+$/.test(lastPart) && lastPart.length > 12) {
    return lastPart.substring(0, 8) + '...';
  }

  return lastPart || 'User';
}

/**
 * Batch resolve multiple DIDs to usernames
 */
export async function batchResolveDIDsToUsernames(dids: string[]): Promise<Map<string, string>> {
  try {
    const users = await db.user.findMany({
      where: { 
        did: { in: dids } 
      },
      select: {
        did: true,
        primaryHandle: true,
        profile: {
          select: {
            displayName: true
          }
        }
      }
    });

    const result = new Map<string, string>();
    
    users.forEach(user => {
      const username = user.profile?.displayName || user.primaryHandle;
      if (username) {
        result.set(user.did, username);
      }
    });

    return result;
  } catch (error) {
    console.error('Error batch resolving DIDs to usernames:', error);
    return new Map();
  }
}