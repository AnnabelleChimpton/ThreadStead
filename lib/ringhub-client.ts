/**
 * Ring Hub Client SDK with HTTP Signature Authentication
 *
 * This client provides a TypeScript interface to Ring Hub APIs
 * with proper Ed25519 HTTP signature authentication for write operations.
 */

import crypto from 'crypto';
import { featureFlags } from '@/lib/feature-flags'

// Types for Ring Hub API compatibility
export interface RingDescriptor {
  id?: string              // Ring ID (returned by API, not settable)
  uri: string              // Canonical URI for the ring
  name: string             // Display name
  description?: string     // Optional description
  slug: string             // URL-friendly identifier
  shortCode?: string       // Short code (2-10 alphanumeric + hyphens)

  // Settings
  joinPolicy: 'OPEN' | 'APPLICATION' | 'INVITATION' | 'CLOSED'
  visibility: 'PUBLIC' | 'UNLISTED' | 'PRIVATE'
  postPolicy?: 'OPEN' | 'MEMBERS' | 'CURATED' | 'CLOSED'

  // Hierarchical (The Spool Architecture)
  parentUri?: string       // Parent ring URI
  parentId?: string        // Parent ring ID
  spoolUri: string         // Spool URI for this instance
  lineageDepth: number     // Depth in genealogy tree
  ownerDid?: string        // Owner's DID

  // Counters
  memberCount: number      // Current member count
  postCount: number        // Associated post count
  descendantCount: number  // Total descendant rings

  // Badge fields
  badgeImageUrl?: string   // 88x31 badge image URL
  badgeImageHighResUrl?: string // High-res badge image URL

  // Metadata
  createdAt: string        // ISO timestamp
  updatedAt?: string       // ISO timestamp
  curatorNote?: string     // Curator's note (singular, matching API)
  curatorNotes?: string    // Curator's notes (legacy, for compatibility)
  metadata?: any           // Additional metadata
  policies?: any           // Ring policies
}

export interface RingMember {
  actorDid: string         // User DID 
  actorName?: string       // Display name (if available)
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
    // We'll need to modify the request method to handle this
    return new RingHubClient({
      baseUrl: process.env.RING_HUB_URL!,
      instanceDID: 'public-client',
      privateKeyBase64Url: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', // Dummy key, won't be used
      publicKeyMultibase: 'zAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' // Dummy key, won't be used
    })
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
    sort?: 'trending' | 'newest' | 'members' | 'posts' | 'alphabetical'
    limit?: number
    offset?: number
  }): Promise<{ rings: RingDescriptor[], total: number }> {
    const params = new URLSearchParams()
    if (options?.search) params.append('search', options.search)
    if (options?.sort) params.append('sort', options.sort)
    if (options?.limit) params.append('limit', options.limit.toString())
    if (options?.offset) params.append('offset', options.offset.toString())

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
      ringId: string
      status: 'ACCEPTED' | 'REJECTED' | 'REMOVED' | 'PENDING'
      pinned: boolean
      createdAt: string
      moderatedAt: string
      moderatedBy: string
      moderationNote?: string
    }
    action: string
    moderator: string
    moderatedAt: string
    reason?: string
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
    scope?: 'ring' | 'parent' | 'children' | 'family'
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
    const requiresAuth = method !== 'GET' || path.includes('/trp/my/')
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
      console.log(`Ring Hub ${method} request to ${path}:`, { headers: headers['Authorization'] ? 'signed' : 'unsigned' });
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

    console.log('Signing string:', signingString);

    // Sign with Ed25519 private key
    const signature = crypto.sign(null, Buffer.from(signingString, 'utf8'), this.privateKey)
    const signatureB64 = signature.toString('base64')

    const signatureHeader = `keyId="${keyId}",algorithm="${algorithm}",headers="${signingHeaders.join(' ')}",signature="${signatureB64}"`
    console.log('Generated signature header:', signatureHeader);
    
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
 */
export function createThreadSteadRingHubClient(): RingHubClient {
  return new RingHubClient({
    baseUrl: "https://ringhub.io",
    instanceDID: "did:web:homepageagain.com",
    privateKeyBase64Url: "UimoIIlEt_XaweDHW2sg4g26YuEjc2OYJL3ztbPZz0Y",
    publicKeyMultibase: "z6Mkge2qRL1zoZdrD4XjUjjrF4vQpheVopXu1Fc3j36pooTY"
  })
}