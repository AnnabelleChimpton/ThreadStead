interface User {
  id: string;
  createdAt: Date | string;
  metadata?: any;
  threadRingMemberships?: Array<{ threadRingId: string }>;
}

export function isNewUser(user: User | null | undefined): boolean {
  if (!user) return false;
  
  // Check metadata flag first
  if (user.metadata?.isNewUser) {
    // Check if flag has expired
    if (user.metadata.newUserExpiresAt) {
      const expiresAt = new Date(user.metadata.newUserExpiresAt);
      if (expiresAt > new Date()) {
        return true; // Not expired yet
      }
      return false; // Expired, no longer new user
    } else {
      // No expiration set, treat as active
      return true;
    }
  }
  
  // Fallback: Check account age and ring memberships
  if (!user.createdAt) {
    // If no createdAt, assume they're not new (safer default)
    return false;
  }
  
  const createdAt = typeof user.createdAt === 'string' 
    ? new Date(user.createdAt) 
    : user.createdAt;
  
  // Additional safety check for invalid dates
  if (!createdAt || isNaN(createdAt.getTime())) {
    return false;
  }
    
  const daysOld = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
  const ringCount = user.threadRingMemberships?.length || 0;
  
  // New user if: less than 3 days old AND fewer than 3 rings
  return daysOld < 3 && ringCount < 3;
}

export function getUserExperience(user: User | null | undefined): 'new' | 'regular' {
  return isNewUser(user) ? 'new' : 'regular';
}