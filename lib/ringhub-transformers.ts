/**
 * Data transformation utilities for Ring Hub integration
 * 
 * These utilities handle mapping between ThreadStead's ThreadRing models
 * and Ring Hub's RingDescriptor format during the migration period.
 */

import type { 
  ThreadRing, 
  ThreadRingMember, 
  ThreadRingWithDetails,
  PostThreadRing,
  ThreadRingJoinType,
  ThreadRingVisibility,
  ThreadRingRole
} from '@/types/threadrings'
import type { 
  RingDescriptor, 
  RingMember, 
  PostRef, 
  BadgeInfo 
} from '@/lib/ringhub-client'

/**
 * Map Ring Hub join policy to ThreadStead join type
 */
export function mapJoinPolicyToJoinType(policy: string): ThreadRingJoinType {
  switch (policy) {
    case 'OPEN': return 'open'
    case 'APPLICATION':
    case 'INVITATION': return 'invite'
    case 'CLOSED': return 'closed'
    default: return 'closed'
  }
}

/**
 * Map ThreadStead join type to Ring Hub join policy
 */
export function mapJoinTypeToJoinPolicy(joinType: ThreadRingJoinType): 'OPEN' | 'APPLICATION' | 'INVITATION' | 'CLOSED' {
  switch (joinType) {
    case 'open': return 'OPEN'
    case 'invite': return 'INVITATION'  // Updated to match RingHub spec
    case 'closed': return 'CLOSED'
    default: return 'CLOSED'
  }
}

/**
 * Map Ring Hub post policy to display string
 */
export function mapPostPolicy(policy: string): string {
  switch (policy) {
    case 'OPEN': return 'open'
    case 'MEMBERS': return 'members'
    case 'CURATED': return 'curated'
    case 'CLOSED': return 'closed'
    default: return 'members'
  }
}

/**
 * Map Ring Hub visibility to ThreadStead visibility
 */
export function mapVisibility(visibility: string): ThreadRingVisibility {
  switch (visibility.toLowerCase()) {
    case 'public': return 'public'
    case 'unlisted': return 'unlisted' 
    case 'private': return 'private'
    default: return 'public'
  }
}

/**
 * Map ThreadStead visibility to Ring Hub visibility
 */
export function mapVisibilityToRingHub(visibility: ThreadRingVisibility): string {
  switch (visibility) {
    case 'public': return 'PUBLIC'
    case 'unlisted': return 'UNLISTED'
    case 'private': return 'PRIVATE'
    default: return 'PUBLIC'
  }
}

/**
 * Transform Ring Hub RingDescriptor to ThreadStead ThreadRing
 */
export function transformRingDescriptorToThreadRing(
  descriptor: RingDescriptor,
  curatorId?: string
): ThreadRing {
  // Generate ThreadStead-compatible ID from Ring Hub URI or slug
  const id = generateThreadRingId(descriptor.uri || descriptor.slug)
  
  return {
    id,
    uri: descriptor.uri || `ringhub:ring:${descriptor.slug}`,
    curatorId: curatorId || 'unknown', // Will need DID -> user mapping
    name: descriptor.name,
    slug: descriptor.slug,
    description: descriptor.description,
    joinType: mapJoinPolicyToJoinType(descriptor.joinPolicy || 'CLOSED'),
    visibility: mapVisibility(descriptor.visibility),
    memberCount: descriptor.memberCount,
    postCount: descriptor.postCount,
    currentPrompt: undefined, // TODO: Extract from Ring Hub metadata
    curatorNote: descriptor.curatorNotes,
    themeCss: undefined, // Not supported in Ring Hub initially
    createdAt: descriptor.createdAt,
    updatedAt: descriptor.updatedAt || descriptor.createdAt
  }
}

/**
 * Transform ThreadStead ThreadRing to Ring Hub RingDescriptor format for creation
 */
export function transformThreadRingToRingDescriptor(
  ring: Partial<ThreadRing>,
  instanceDID: string
): Partial<RingDescriptor> {
  // Generate Ring Hub URI for this ring
  const uri = generateRingUri(ring.slug!, instanceDID)
  
  return {
    name: ring.name!,
    slug: ring.slug!,
    description: ring.description,
    joinPolicy: mapJoinTypeToJoinPolicy(ring.joinType || 'open'), // Ring Hub expects uppercase joinPolicy
    visibility: (ring.visibility?.toUpperCase() || 'PUBLIC') as 'PUBLIC' | 'UNLISTED' | 'PRIVATE',
    uri,
    spoolUri: generateSpoolUri(instanceDID), // The Spool for this instance
    lineageDepth: 'parentUri' in ring && ring.parentUri ? 1 : 0, // Will be calculated by Ring Hub
    memberCount: 0, // New ring starts with 0 members
    postCount: 0, // New ring starts with 0 posts
    descendantCount: 0, // New ring starts with 0 descendants
    createdAt: new Date().toISOString(),
    curatorNotes: ring.curatorNote
  }
}

/**
 * Transform Ring Hub RingMember to ThreadStead ThreadRingMember
 */
export function transformRingMemberToThreadRingMember(
  member: RingMember,
  threadRingId: string,
  userId?: string
): ThreadRingMember {
  return {
    id: generateMemberId(member.did, threadRingId),
    threadRingId,
    userId: userId || member.did, // Will need DID -> user mapping
    role: member.role as ThreadRingRole,
    joinedAt: member.joinedAt,
    user: {
      id: userId || member.did,
      displayName: undefined, // TODO: Resolve from DID
      avatarUrl: undefined, // TODO: Resolve from DID
      handles: [] // TODO: Extract from DID document
    }
  }
}

/**
 * Transform ThreadStead PostThreadRing to Ring Hub PostRef
 */
export function transformPostThreadRingToPostRef(
  postThreadRing: PostThreadRing,
  postUri: string,
  digest: string,
  submitterDID: string
): Omit<PostRef, 'submittedAt'> {
  return {
    uri: postUri,
    digest,
    submittedBy: submitterDID,
    isPinned: postThreadRing.isPinned,
    metadata: {
      threadsteadPostId: postThreadRing.postId,
      addedAt: postThreadRing.addedAt,
      addedBy: postThreadRing.addedBy,
      pinnedAt: postThreadRing.pinnedAt,
      pinnedBy: postThreadRing.pinnedBy
    }
  }
}

/**
 * Transform Ring Hub PostRef to ThreadStead PostThreadRing
 */
export function transformPostRefToPostThreadRing(
  postRef: PostRef,
  threadRingId: string
): PostThreadRing {
  const metadata = postRef.metadata || {}
  
  return {
    id: generatePostThreadRingId(postRef.uri, threadRingId),
    postId: metadata.threadsteadPostId || extractPostIdFromUri(postRef.uri),
    threadRingId,
    addedAt: metadata.addedAt || postRef.submittedAt,
    addedBy: metadata.addedBy || postRef.submittedBy,
    isPinned: postRef.isPinned,
    pinnedAt: metadata.pinnedAt,
    pinnedBy: metadata.pinnedBy,
    threadRing: {} as ThreadRing // Will be populated separately
  }
}

/**
 * Create a badge info object for Ring Hub from ThreadStead data
 */
export function createBadgeInfo(
  ring: ThreadRing,
  member: ThreadRingMember
): BadgeInfo {
  return {
    title: `${ring.name} Member`,
    subtitle: `Joined ${new Date(member.joinedAt).getFullYear()}`,
    backgroundColor: '#3B82F6', // Default blue
    textColor: '#FFFFFF',
    imageUrl: undefined // TODO: Generate 88x31 badge image
  }
}

/**
 * Generate ThreadStead-compatible ID from Ring Hub URI
 */
function generateThreadRingId(uri: string | undefined): string {
  // Create a deterministic ID from the URI or generate a random one
  if (!uri) {
    // If no URI, generate a random ID
    return Math.random().toString(36).substring(2, 18)
  }
  return Buffer.from(uri).toString('base64').substring(0, 16)
}

/**
 * Generate Ring Hub URI for a ThreadStead ring
 */
function generateRingUri(slug: string, instanceDID: string): string {
  // Extract domain from DID if it's a did:web
  if (instanceDID.startsWith('did:web:')) {
    const domain = instanceDID.replace('did:web:', '').replace(/%3A/g, ':')
    return `https://${domain}/threadrings/${slug}`
  }
  
  // Fallback for other DID methods
  return `threadstead:ring:${slug}`
}

/**
 * Generate Spool URI for this ThreadStead instance
 */
function generateSpoolUri(instanceDID: string): string {
  if (instanceDID.startsWith('did:web:')) {
    const domain = instanceDID.replace('did:web:', '').replace(/%3A/g, ':')
    return `https://${domain}/threadrings/spool`
  }
  
  return `threadstead:spool`
}

/**
 * Generate member ID from DID and thread ring ID
 */
function generateMemberId(did: string, threadRingId: string): string {
  return Buffer.from(`${did}:${threadRingId}`).toString('base64').substring(0, 16)
}

/**
 * Generate post-thread ring association ID
 */
function generatePostThreadRingId(postUri: string, threadRingId: string): string {
  return Buffer.from(`${postUri}:${threadRingId}`).toString('base64').substring(0, 16)
}

/**
 * Extract post ID from post URI
 */
function extractPostIdFromUri(uri: string): string {
  // Handle ThreadStead post URIs like https://domain.com/posts/[id]
  const matches = uri.match(/\/posts\/([^\/\?]+)/)
  return matches ? matches[1] : uri.split('/').pop() || uri
}

/**
 * Batch transform multiple Ring Hub rings to ThreadStead format
 */
export function transformRingsBatch(
  descriptors: RingDescriptor[]
): ThreadRing[] {
  return descriptors.map(desc => transformRingDescriptorToThreadRing(desc))
}

/**
 * Batch transform multiple Ring Hub members to ThreadStead format
 */
export function transformMembersBatch(
  members: RingMember[],
  threadRingId: string
): ThreadRingMember[] {
  return members.map(member => 
    transformRingMemberToThreadRingMember(member, threadRingId)
  )
}

/**
 * Batch transform multiple Ring Hub post refs to ThreadStead format
 */
export function transformPostRefsBatch(
  postRefs: PostRef[],
  threadRingId: string
): PostThreadRing[] {
  return postRefs.map(ref => 
    transformPostRefToPostThreadRing(ref, threadRingId)
  )
}

/**
 * Error handling for transformation operations
 */
export class TransformationError extends Error {
  constructor(message: string, public source?: any) {
    super(message)
    this.name = 'TransformationError'
  }
}

/**
 * Validate that a Ring Hub response can be safely transformed
 */
export function validateRingDescriptor(descriptor: any): descriptor is RingDescriptor {
  return (
    typeof descriptor === 'object' &&
    typeof descriptor.uri === 'string' &&
    typeof descriptor.name === 'string' &&
    typeof descriptor.slug === 'string' &&
    typeof descriptor.memberCount === 'number' &&
    typeof descriptor.postCount === 'number'
  )
}

/**
 * Validate that a Ring Hub member can be safely transformed
 */
export function validateRingMember(member: any): member is RingMember {
  return (
    typeof member === 'object' &&
    typeof member.did === 'string' &&
    typeof member.role === 'string' &&
    typeof member.joinedAt === 'string'
  )
}

/**
 * Validate that a Ring Hub post ref can be safely transformed
 */
export function validatePostRef(postRef: any): postRef is PostRef {
  return (
    typeof postRef === 'object' &&
    typeof postRef.uri === 'string' &&
    typeof postRef.digest === 'string' &&
    typeof postRef.submittedBy === 'string' &&
    typeof postRef.submittedAt === 'string'
  )
}