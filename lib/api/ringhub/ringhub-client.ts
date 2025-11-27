/**
 * Ring Hub Client SDK with HTTP Signature Authentication
 *
 * This client provides a TypeScript interface to Ring Hub APIs
 * with proper Ed25519 HTTP signature authentication for write operations.
 */

import crypto from 'crypto';
import { featureFlags } from '@/lib/utils/features/feature-flags'

// Types for Ring Hub API compatibility
export interface RingDescriptor {
  // Basic ring info
  id: string
  slug: string
  name: string
  description: string | null
  shortCode: string | null
  visibility: "PUBLIC" | "UNLISTED" | "PRIVATE"
  joinPolicy: "OPEN" | "APPLICATION" | "INVITATION" | "CLOSED"
  postPolicy: "OPEN" | "MEMBERS" | "CURATED" | "CLOSED"
  ownerDid: string
  parentId: string | null
  createdAt: string        // ISO timestamp
  updatedAt: string        // ISO timestamp
  curatorNote: string | null
  bannerUrl: string | null
  themeColor: string | null
  badgeImageUrl: string | null
  badgeImageHighResUrl: string | null
  metadata: Record<string, any> | null
  policies: Record<string, any> | null

  // Computed fields (always included)
  memberCount: number
  postCount: number

  // Optional fields (based on query parameters)
  lineage?: Array<{
    id: string
    slug: string
    name: string
  }>
  children?: Array<{
    id: string
    slug: string
    name: string
    memberCount: number
  }>

  // 🔥 KEY FIELD: Current user's membership (only if authenticated)
  currentUserMembership?: {
    status: "PENDING" | "ACTIVE" | "SUSPENDED" | "REVOKED"
    role: string | null
    joinedAt: string | null  // ISO timestamp
    badgeId: string | null
  }

  // Legacy/compatibility fields for ThreadStead
  uri?: string             // Canonical URI for the ring (computed)
  spoolUri?: string        // Spool URI for this instance (computed)
  lineageDepth?: number    // Depth in genealogy tree (computed)
  descendantCount?: number // Total descendant rings (computed)
  parentUri?: string       // Parent ring URI (computed from parentId)
  curatorNotes?: string    // Legacy alias for curatorNote
}

export interface RingMember {
  actorDid: string         // User DID
  actorName?: string       // Display name (if available)
  avatarUrl?: string       // Avatar image URL (from federated profile)
  profileUrl?: string      // Profile page URL (from federated profile)
  instanceDomain?: string  // Home instance domain (from federated profile)
  status: 'ACTIVE' | 'PENDING' | 'BANNED'
  role: 'owner' | 'moderator' | 'member'
  joinedAt: string | null  // ISO timestamp
  badgeId?: string         // Badge ID
}

export interface PostRef {
  id?: string              // Post ID (for curation operations)
  uri: string              // Post canonical URI
  digest: string           // Content hash
  submittedBy: string      // Author DID
  submittedAt: string      // ISO timestamp
  isPinned: boolean        // Pin status
  status?: 'ACCEPTED' | 'REJECTED' | 'REMOVED' | 'PENDING'  // Moderation status
  moderatedAt?: string     // ISO timestamp when moderated
  moderatedBy?: string     // Moderator DID
  moderationNote?: string  // Moderation reason/note
  metadata?: any           // Additional context
}

export interface BadgeInfo {
  title: string
  subtitle?: string
  imageUrl?: string
  backgroundColor: string
  textColor: string
}

export class RingHubClientError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string,
    public data?: any
  ) {
    super(message)
    this.name = 'RingHubClientError'
    this.data = data
  }
}

export class RingHubClient {
  private baseUrl: string
  private instanceDID: string
  private privateKey: crypto.KeyObject
  private publicKeyMultibase: string

  constructor(options: {
    baseUrl: string
    instanceDID: string
    privateKeyBase64Url: string
    publicKeyMultibase: string
  }) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '') // Remove trailing slash
    this.instanceDID = options.instanceDID
    this.publicKeyMultibase = options.publicKeyMultibase

    // Skip private key processing for public clients
    if (options.instanceDID === 'public-client') {
      // Create a dummy private key that won't be used
      this.privateKey = {} as crypto.KeyObject;
      return;
    }

    // Convert Base64URL private key to crypto.KeyObject
    try {
      const privateKeyBytes = this.base64UrlToBytes(options.privateKeyBase64Url)

      // Create PKCS#8 DER format for Ed25519
      const pkcs8Header = Buffer.from([
        0x30, 0x2e, // SEQUENCE, 46 bytes
        0x02, 0x01, 0x00, // INTEGER 0 (version)
        0x30, 0x05, // SEQUENCE, 5 bytes (algorithm identifier)
        0x06, 0x03, 0x2b, 0x65, 0x70, // OID 1.3.101.112 (Ed25519)
        0x04, 0x22, // OCTET STRING, 34 bytes
        0x04, 0x20  // OCTET STRING, 32 bytes (the key)
      ])

      const pkcs8Key = Buffer.concat([pkcs8Header, privateKeyBytes])

      this.privateKey = crypto.createPrivateKey({
        key: pkcs8Key,
        format: 'der',
        type: 'pkcs8'
      })
    } catch (error) {
      throw new Error(`Failed to create private key: ${error}`)
    }
  }

  /**
   * Check if Ring Hub is available and configured
   */
  static isAvailable(): boolean {
    return featureFlags.ringhub() &&
      !!process.env.RING_HUB_URL &&
      !!process.env.THREADSTEAD_DID &&
      !!process.env.THREADSTEAD_PRIVATE_KEY_B64URL
  }

  /**
   * Create a Ring Hub client instance from environment variables
   */
  static fromEnvironment(): RingHubClient | null {
    if (!RingHubClient.isAvailable()) {
      return null
    }

    return new RingHubClient({
      baseUrl: process.env.RING_HUB_URL!,
      instanceDID: process.env.THREADSTEAD_DID!,
      privateKeyBase64Url: process.env.THREADSTEAD_PRIVATE_KEY_B64URL!,
      publicKeyMultibase: process.env.THREADSTEAD_PUBLIC_KEY_MULTIBASE!
    })
  }

  /**
   * Create a public Ring Hub client for unauthenticated requests
   * This client can only make GET requests to public endpoints
   */
  static createPublicClient(): RingHubClient | null {
    if (!featureFlags.ringhub() || !process.env.RING_HUB_URL) {
      return null
    }

    // Create a minimal client that can only make public GET requests
    // Use properly formatted 32-byte base64url dummy key
    const client = new RingHubClient({
      baseUrl: process.env.RING_HUB_URL!,
      instanceDID: 'public-client',
      privateKeyBase64Url: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA_', // 32-byte base64url dummy key
      publicKeyMultibase: 'z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK' // Valid multibase dummy
    })

      // Mark this client as public to skip authentication
      ; (client as any).isPublicClient = true

    return client
  }

  // Ring Operations


  /**
   * Get ring by slug
   */
  async getRing(slug: string): Promise<RingDescriptor | null> {
    try {
      return await this.get(`/trp/rings/${slug}`)
    } catch (error) {
      if (error instanceof RingHubClientError && error.status === 404) {
        return null
      }
      throw error
    }
  }

  /**
   * Update ring settings
   */
  async updateRing(slug: string, updates: Partial<RingDescriptor>): Promise<RingDescriptor> {
    return this.put(`/trp/rings/${slug}`, updates)
  }

  /**
   * Update ring badge design (owner/curator only)
   */
  async updateRingBadge(slug: string, updates: {
    badgeImageUrl?: string;
    badgeImageHighResUrl?: string;
    description?: string;
    criteria?: string;
    updateExistingBadges?: boolean; // Default: false
  }): Promise<{
    success: boolean;
    message: string;
    badgeImageUrl?: string;
    badgeImageHighResUrl?: string;
    description?: string;
    criteria?: string;
    badgesUpdated?: number; // Number of existing badges regenerated
  }> {
    return this.put(`/trp/rings/${slug}/badge`, updates)
  }

  /**
   * Delete ring
   */
  async deleteRing(slug: string): Promise<void> {
    await this.delete(`/trp/rings/${slug}`)
  }

  /**
   * Search/list rings
   */
  async listRings(options?: {
    search?: string
    sort?: 'created' | 'updated' | 'name' | 'members' | 'posts'
    order?: 'asc' | 'desc'
    visibility?: 'PUBLIC' | 'UNLISTED' | 'PRIVATE'
    limit?: number
    offset?: number
    memberDid?: string
  }): Promise<{ rings: RingDescriptor[], total: number }> {
    const params = new URLSearchParams()
    if (options?.search) params.append('search', options.search)
    if (options?.sort) params.append('sort', options.sort)
    if (options?.order) params.append('order', options.order)
    if (options?.visibility) params.append('visibility', options.visibility)
    if (options?.limit) params.append('limit', options.limit.toString())
    if (options?.offset) params.append('offset', options.offset.toString())
    if (options?.memberDid) params.append('memberDid', options.memberDid)

    return this.get(`/trp/rings?${params.toString()}`)
  }

  /**
   * Get root ring (The Spool)
   */
  async getRootRing(): Promise<RingDescriptor> {
    return this.get(`/trp/root`)
  }

  /**
   * Get Ring Hub network statistics
   */
  async getStats(): Promise<{
    totalRings: number
    publicRings: number
    privateRings: number
    unlistedRings: number
    totalActors: number
    verifiedActors: number
    totalMemberships: number
    activeMemberships: number
    totalPosts: number
    acceptedPosts: number
  }> {
    return this.get(`/trp/stats`)
  }

  /**
   * Get current user's memberships (requires authentication)
   */
  async getMyMemberships(options?: {
    status?: 'ACTIVE' | 'PENDING' | 'REVOKED'
    limit?: number
    offset?: number
  }): Promise<{
    memberships: Array<{
      ringSlug: string
      ringName: string
      ringDescription?: string
      ringVisibility: 'PUBLIC' | 'UNLISTED' | 'PRIVATE'
      status: 'ACTIVE' | 'PENDING' | 'REVOKED'
      role: 'owner' | 'moderator' | 'member'
      joinedAt: string
      badgeId?: string
    }>
    total: number
    limit: number
    offset: number
    hasMore: boolean
  }> {
    const params = new URLSearchParams()
    if (options?.status) params.append('status', options.status)
    if (options?.limit) params.append('limit', options.limit.toString())
    if (options?.offset) params.append('offset', options.offset.toString())

    const queryString = params.toString()
    const path = `/trp/my/memberships${queryString ? `?${queryString}` : ''}`

    return this.get(path)
  }

  // Membership Operations

  /**
   * Join a ring
   */
  async joinRing(slug: string, message?: string): Promise<RingMember> {
    const body: any = { ringSlug: slug }
    if (message) body.message = message
    return this.post(`/trp/join`, body)
  }

  /**
   * Leave a ring
   */
  async leaveRing(slug: string): Promise<void> {
    await this.post(`/trp/leave`, { ringSlug: slug })
  }

  /**
   * Notify RingHub that this actor's profile has been updated
   *
   * RingHub will re-resolve the DID document to get updated profile data.
   * This enables real-time profile synchronization across federated instances.
   *
   * NOTE: This endpoint must be implemented by RingHub team.
   * Expected endpoint: POST /trp/actors/{did}/profile-updated
   *
   * @param actorDid - The DID of the actor whose profile changed
   */
  async notifyProfileUpdate(actorDid: string): Promise<void> {
    const encodedDid = encodeURIComponent(actorDid)
    await this.post(`/trp/actors/${encodedDid}/profile-updated`, {
      actorDid,
      updatedAt: new Date().toISOString()
    })
  }

  /**
   * Get ring members
   */
  async getRingMembers(slug: string): Promise<{
    members: RingMember[]
    total: number
    limit: number
    offset: number
    hasMore: boolean
  }> {
    return this.get(`/trp/rings/${slug}/members`)
  }

  /**
   * Invite a member to join a ring
   */
  async inviteMember(slug: string, inviteeDid: string, expiresAt?: string): Promise<{
    success: boolean
    invitation: {
      id: string
      ringSlug: string
      inviteeDid: string
      inviterDid: string
      status: string
      createdAt: string
      expiresAt: string
    }
  }> {
    return this.post(`/trp/rings/${slug}/invite`, { inviteeDid, expiresAt })
  }

  /**
   * Update a member's role
   */
  async updateMemberRole(slug: string, actorDid: string, role: 'member' | 'moderator'): Promise<{
    success: boolean
    member: {
      actorDid: string
      role: string
      updatedAt: string
    }
  }> {
    return this.put(`/trp/rings/${slug}/members/${actorDid}`, { role })
  }

  /**
   * Remove a member from a ring
   */
  async removeMember(slug: string, actorDid: string): Promise<{
    success: boolean
    message: string
  }> {
    return this.delete(`/trp/rings/${slug}/members/${actorDid}`)
  }

  // Content Operations

  /**
   * Submit post to ring
   */
  async submitPost(ringSlug: string, postSubmission: {
    uri: string
    digest: string
    actorDid?: string
    metadata?: any
  }): Promise<{
    id: string
    ringSlug: string
    uri: string
    digest: string
    actorDid: string
    submittedBy: string
    submittedAt: string
    status: 'ACCEPTED' | 'PENDING'
    moderatedAt?: string
    moderatedBy?: string
    metadata?: any
  }> {
    const requestBody = {
      ringSlug,
      ...postSubmission
    }
    return await this.post('/trp/submit', requestBody)
  }

  /**
   * Moderate/curate content posts in ThreadRings
   */
  async curatePost(postId: string, action: 'accept' | 'reject' | 'pin' | 'unpin' | 'remove', options?: {
    reason?: string
    metadata?: any
  }): Promise<{
    post: {
      id: string
      uri: string
      actorDid: string
      ringId?: string
      ringSlug?: string
      status: 'ACCEPTED' | 'REJECTED' | 'REMOVED' | 'PENDING'
      pinned: boolean
      createdAt?: string
      submittedAt?: string
      submittedBy?: string
      moderatedAt: string
      moderatedBy: string
      moderationNote?: string
      digest?: string
      metadata?: any
    }
    action: string
    moderator: string
    moderatedAt: string
    reason?: string
    isAuthorAction?: boolean
    globalRemoval?: boolean
    ringSpecific?: boolean
    affectedRings?: Array<{
      id: string
      slug: string
    }>
    totalRemoved?: number
  }> {
    const requestBody: any = {
      postId,
      action
    }

    if (options?.reason) {
      requestBody.reason = options.reason
    }

    if (options?.metadata) {
      requestBody.metadata = options.metadata
    }

    return await this.post('/trp/curate', requestBody)
  }

  /**
   * Get ring feed
   */
  async getRingFeed(slug: string, options?: {
    limit?: number
    offset?: number
    scope?: 'ring' | 'parent' | 'children' | 'siblings' | 'family'
  }): Promise<{ posts: PostRef[], total: number }> {
    const params = new URLSearchParams()
    if (options?.limit) params.append('limit', options.limit.toString())
    if (options?.offset) params.append('offset', options.offset.toString())
    if (options?.scope) params.append('scope', options.scope)

    return this.get(`/trp/rings/${slug}/feed?${params.toString()}`)
  }

  /**
   * Get ring lineage/genealogy
   */
  async getRingLineage(slug: string): Promise<{
    ring: RingDescriptor
    ancestors: RingDescriptor[]
    descendants: any[] // Nested tree structure with children
    generatedAt: string
  }> {
    return this.get(`/trp/rings/${slug}/lineage`)
  }

  /**
   * Get public membership info for a ring
   * No authentication required - returns member count and owner/moderator info
   */
  async getRingMembershipInfo(slug: string): Promise<{
    memberCount: number
    owner: {
      actorDid: string
      actorName: string | null
      joinedAt: string
    }
    moderators: Array<{
      actorDid: string
      actorName: string | null
      joinedAt: string
    }>
  }> {
    return this.get(`/trp/rings/${slug}/membership-info`)
  }

  /**
   * Get actor badges (public endpoint)
   * No authentication required - returns badges for a specific DID
   */
  async getActorBadges(did: string, options?: {
    status?: 'active' | 'revoked' | 'all'
    limit?: number
    offset?: number
  }): Promise<{
    badges: Array<{
      badge: any // Full Open Badge JSON-LD
      ring: {
        slug: string
        name: string
        visibility: 'PUBLIC' | 'UNLISTED' | 'PRIVATE'
      }
      membership: {
        role: string
        joinedAt: string
        status: string
      }
      issuedAt: string
      isRevoked: boolean
      revokedAt: string | null
      revocationReason: string | null
    }>
    total: number
    limit: number
    offset: number
    hasMore: boolean
  }> {
    const params = new URLSearchParams()
    if (options?.status) params.append('status', options.status)
    if (options?.limit) params.append('limit', options.limit.toString())
    if (options?.offset) params.append('offset', options.offset.toString())

    const query = params.toString() ? `?${params.toString()}` : ''
    return this.get(`/trp/actors/${encodeURIComponent(did)}/badges${query}`)
  }

  /**
   * Fork a ring
   */
  async forkRing(parentSlug: string, forkData: Partial<RingDescriptor>): Promise<RingDescriptor> {
    const requestData = {
      ...forkData,
      parentSlug
    }
    return this.post(`/trp/fork`, requestData)
  }

  // Feed Operations

  /**
   * Get authenticated user's feed from their rings
   */
  async getMyFeed(options?: {
    limit?: number;
    offset?: number;
    since?: string;
    until?: string;
    includeNotifications?: boolean;
    ringId?: string;
    sort?: 'newest' | 'oldest';
  }): Promise<{
    posts: Array<{
      id: string;
      ringId: string;
      ringSlug: string;
      ringName: string;
      actorDid: string;
      actorName: string | null;
      uri: string;
      digest: string;
      submittedAt: string;
      submittedBy: string;
      status: 'ACCEPTED';
      metadata: any | null;
      pinned: boolean;
      isNotification: boolean;
      notificationType: string | null;
    }>;
    pagination: {
      total: number;
      limit: number;
      offset: number;
      hasMore: boolean;
    };
    generatedAt: string;
  }> {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());
    if (options?.since) params.append('since', options.since);
    if (options?.until) params.append('until', options.until);
    if (options?.includeNotifications !== undefined) {
      params.append('includeNotifications', options.includeNotifications.toString());
    }
    if (options?.ringId) params.append('ringId', options.ringId);
    if (options?.sort) params.append('sort', options.sort);

    const queryString = params.toString();
    return this.get(`/trp/my/feed${queryString ? `?${queryString}` : ''}`);
  }

  /**
   * Get trending posts feed (public endpoint)
   */
  async getTrendingFeed(options?: {
    limit?: number;
    timeWindow?: 'hour' | 'day' | 'week';
    includeNotifications?: boolean;
  }): Promise<{
    posts: Array<{
      id: string;
      ringId: string;
      ringSlug: string;
      ringName: string;
      actorDid: string;
      actorName: string | null;
      uri: string;
      digest: string;
      submittedAt: string;
      submittedBy: string;
      status: 'ACCEPTED';
      metadata: any | null;
      pinned: boolean;
      isNotification: boolean;
      notificationType: string | null;
    }>;
    timeWindow: string;
    generatedAt: string;
  }> {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.timeWindow) params.append('timeWindow', options.timeWindow);
    // Only include includeNotifications if explicitly set to true
    // Some RingHub instances may not handle false values correctly
    if (options?.includeNotifications === true) {
      params.append('includeNotifications', 'true');
    }

    const queryString = params.toString();
    return this.get(`/trp/trending/feed${queryString ? `?${queryString}` : ''}`);
  }

  // HTTP Helper Methods with Signature Authentication

  private async request(
    method: string,
    path: string,
    body?: any
  ): Promise<any> {
    const url = `${this.baseUrl}${path}`
    const urlObj = new URL(url)

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'ThreadStead-RingHub-Client/1.0',
      'Host': urlObj.host,
      'Date': new Date().toUTCString(),
    }

    let bodyString = ''
    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      bodyString = JSON.stringify(body)
      headers['Content-Length'] = bodyString.length.toString()

      // Generate content digest for body
      const hash = crypto.createHash('sha256').update(bodyString).digest('base64')
      headers['Digest'] = `sha-256=${hash}`
    }

    // Generate HTTP signature for write operations and specific authenticated GET endpoints
    const isPublicClient = (this as any).isPublicClient === true
    const requiresAuth = !isPublicClient && (
      method !== 'GET' ||
      path.includes('/trp/my/') ||
      path.startsWith('/trp/rings') || // Sign ring list requests to get membership info
      path.match(/^\/trp\/rings\/[^\/]+$/) // Sign individual ring requests
    )

    if (requiresAuth) {
      try {
        const signature = await this.generateHttpSignature(method, path, headers)
        headers['Authorization'] = `Signature ${signature}`
      } catch (error) {
        throw new RingHubClientError(`Failed to generate HTTP signature: ${error}`)
      }
    }

    const config: RequestInit = {
      method,
      headers,
    }

    if (bodyString) {
      config.body = bodyString
    }

    try {
      const response = await fetch(url, config)

      if (!response.ok) {
        let errorData
        try {
          errorData = await response.json()
        } catch {
          errorData = { error: `HTTP ${response.status}: ${response.statusText}` }
        }

        // For validation errors, include the full error details
        const errorMessage = errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`
        const fullError = errorData.validation ?
          `${errorMessage}. Validation errors: ${JSON.stringify(errorData.validation, null, 2)}` :
          errorMessage

        throw new RingHubClientError(
          fullError,
          response.status,
          errorData.code,
          errorData // Pass the full error data
        )
      }

      // Handle empty responses
      if (response.status === 204 || response.headers.get('content-length') === '0') {
        return null
      }

      // Check for silent authentication failure header
      const authError = response.headers.get('X-RingHub-Auth-Error')
      if (authError) {
        console.warn(`⚠️ RingHub Authentication Failed Silently: ${authError}`)
      }

      return response.json()
    } catch (error) {
      if (error instanceof RingHubClientError) {
        throw error
      }

      throw new RingHubClientError(
        `Ring Hub request failed: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  private async generateHttpSignature(
    method: string,
    path: string,
    headers: Record<string, string>
  ): Promise<string> {
    const keyId = `${this.instanceDID}#key-1`
    const algorithm = 'ed25519'

    // Build signature string according to HTTP Signature spec
    const signingHeaders = ['(request-target)', 'host', 'date']

    // Add digest for POST/PUT requests
    if (headers['Digest']) {
      signingHeaders.push('digest')
    }

    const signingString = signingHeaders.map(header => {
      if (header === '(request-target)') {
        return `(request-target): ${method.toLowerCase()} ${path}`
      }

      // Map header names to actual header keys
      const headerKeyMap: Record<string, string> = {
        'host': 'Host',
        'date': 'Date',
        'digest': 'Digest'
      }

      const headerKey = headerKeyMap[header.toLowerCase()]
      const headerValue = headers[headerKey]

      if (!headerValue) {
        throw new Error(`Missing header: ${header}`)
      }

      return `${header}: ${headerValue}`
    }).join('\n')

    // Sign with Ed25519 private key
    const signature = crypto.sign(null, Buffer.from(signingString, 'utf8'), this.privateKey)
    const signatureB64 = signature.toString('base64')

    const signatureHeader = `keyId="${keyId}",algorithm="${algorithm}",headers="${signingHeaders.join(' ')}",signature="${signatureB64}"`

    return signatureHeader
  }

  private base64UrlToBytes(base64url: string): Buffer {
    // Convert base64url to base64
    const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')

    // Add padding if necessary
    const padded = base64 + '='.repeat((4 - base64.length % 4) % 4)

    return Buffer.from(padded, 'base64')
  }

  private get(path: string) {
    return this.request('GET', path)
  }

  private post(path: string, body?: any) {
    return this.request('POST', path, body)
  }

  private put(path: string, body?: any) {
    return this.request('PUT', path, body)
  }

  private delete(path: string) {
    return this.request('DELETE', path)
  }
}

/**
 * Get a configured Ring Hub client instance
 * Returns null if Ring Hub is not enabled or configured
 */
export function getRingHubClient(): RingHubClient | null {
  return RingHubClient.fromEnvironment()
}

/**
 * Get a public Ring Hub client for unauthenticated requests
 * Returns null if Ring Hub is not enabled
 */
export function getPublicRingHubClient(): RingHubClient | null {
  return RingHubClient.createPublicClient()
}

/**
 * Utility to check if we should use Ring Hub for ThreadRing operations
 */
export function shouldUseRingHub(): boolean {
  return RingHubClient.isAvailable()
}

/**
 * Create a Ring Hub client with your specific credentials
 * NOTE: Use environment variables instead of hardcoded values for production
 */
export function createThreadSteadRingHubClient(): RingHubClient {
  // Use environment variables to match DID document
  const client = RingHubClient.fromEnvironment();
  if (!client) {
    throw new Error('Ring Hub not configured - missing environment variables');
  }
  return client;
}