// ThreadRings type definitions for future implementation

export type ThreadRingJoinType = 'open' | 'invite' | 'closed';
export type ThreadRingVisibility = 'public' | 'unlisted' | 'private';
export type ThreadRingRole = 'member' | 'moderator' | 'curator';
export type ThreadRingInviteStatus = 'pending' | 'accepted' | 'declined' | 'revoked';

export interface ThreadRing {
  id: string;
  uri: string; // Canonical URI for federation
  curatorId: string;
  name: string;
  slug: string;
  description?: string;
  joinType: ThreadRingJoinType;
  visibility: ThreadRingVisibility;
  memberCount: number;
  postCount: number;
  currentPrompt?: string;
  curatorNote?: string;
  themeCss?: string;
  createdAt: string;
  updatedAt: string;
  // Badge
  badge?: {
    id: string;
    title: string;
    subtitle?: string;
    templateId?: string;
    backgroundColor: string;
    textColor: string;
    imageUrl?: string;
    isActive: boolean;
  };
}

export interface ThreadRingMember {
  id: string;
  threadRingId: string;
  userId: string;
  role: ThreadRingRole;
  joinedAt: string;
  user: {
    id: string;
    displayName?: string;
    avatarUrl?: string;
    handles: Array<{ handle: string; host: string }>;
  };
}

export interface PostThreadRing {
  id: string;
  postId: string;
  threadRingId: string;
  addedAt: string;
  addedBy: string;
  isPinned: boolean;
  pinnedAt?: string;
  pinnedBy?: string;
  threadRing: ThreadRing;
}

export interface ThreadRingInvite {
  id: string;
  threadRingId: string;
  inviterId: string;
  inviteeId: string;
  status: ThreadRingInviteStatus;
  createdAt: string;
  respondedAt?: string;
  threadRing: ThreadRing;
  inviter: {
    id: string;
    displayName?: string;
    handles: Array<{ handle: string; host: string }>;
  };
}

export interface ThreadRingFork {
  id: string;
  originalRingId: string;
  forkedRingId: string;
  forkedById: string;
  parentRingUri: string; // URI for federation lineage
  forkReason?: string;
  createdAt: string;
  forkedBy: {
    id: string;
    displayName?: string;
    handles: Array<{ handle: string; host: string }>;
  };
  forkedRing: ThreadRing;
}

export interface ThreadRingWithDetails extends ThreadRing {
  curator: {
    id: string;
    displayName?: string;
    avatarUrl?: string;
    handles: Array<{ handle: string; host: string }>;
  };
  members: ThreadRingMember[];
  isUserMember: boolean;
  userRole?: ThreadRingRole;
  hasPendingInvite: boolean;
  forkedFrom?: ThreadRingFork; // If this ring is a fork
  forkCount: number; // Number of times this ring has been forked
}

// API request/response types
export interface CreateThreadRingRequest {
  name: string;
  slug: string;
  description?: string;
  joinType: ThreadRingJoinType;
  visibility: ThreadRingVisibility;
}

export interface UpdateThreadRingRequest {
  name?: string;
  description?: string;
  joinType?: ThreadRingJoinType;
  visibility?: ThreadRingVisibility;
}

export interface InviteToThreadRingRequest {
  userIds: string[];
  message?: string;
}

export interface ForkThreadRingRequest {
  name: string;
  slug: string;
  description?: string;
  joinType?: ThreadRingJoinType;
  visibility?: ThreadRingVisibility;
  forkReason?: string;
}

export interface ThreadRingPostsResponse {
  posts: Array<{
    id: string;
    title?: string;
    bodyHtml?: string;
    bodyText?: string;
    createdAt: string;
    author: {
      id: string;
      displayName?: string;
      avatarUrl?: string;
      handles: Array<{ handle: string; host: string }>;
    };
    threadRings: PostThreadRing[];
  }>;
  pagination: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

export interface ThreadRingDirectoryResponse {
  threadRings: Array<ThreadRing & {
    curator: {
      displayName?: string;
      handles: Array<{ handle: string; host: string }>;
    };
  }>;
  pagination: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

// Additional types for new features
export interface ThreadRingAuditLog {
  id: string;
  threadRingId: string;
  actorId: string;
  action: ThreadRingAuditAction;
  targetType?: string;
  targetId?: string;
  targetUri?: string;
  oldValue?: any;
  newValue?: any;
  reason?: string;
  createdAt: string;
  actor: {
    id: string;
    displayName?: string;
    handles: Array<{ handle: string; host: string }>;
  };
}

export type ThreadRingAuditAction = 
  | 'member_add'
  | 'member_remove' 
  | 'member_role_change'
  | 'post_remove'
  | 'post_pin'
  | 'post_unpin'
  | 'ring_update'
  | 'user_block'
  | 'user_unblock';

export interface ThreadRingPrompt {
  id: string;
  threadRingId: string;
  content: string;
  createdBy: string;
  createdAt: string;
  isActive: boolean;
}

export interface TrendingRingsResponse {
  rings: Array<ThreadRing & {
    recentActivity: number;
    trendingScore: number;
  }>;
}