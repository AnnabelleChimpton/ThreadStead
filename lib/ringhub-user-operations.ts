/**
 * Ring Hub User Operations
 * 
 * High-level utilities for Ring Hub operations that automatically handle
 * user DID mapping and authentication for ThreadStead users
 */

import { getRingHubClient, RingHubClient } from './ringhub-client'
import { getOrCreateUserDID, getUserDID, signMessageAsUser, getServerDID, publicKeyToMultibase } from './server-did-client'
import { db } from './db'
import type { RingDescriptor, RingMember } from './ringhub-client'

/**
 * Enhanced Ring Hub client that automatically handles user authentication
 */
export class AuthenticatedRingHubClient {
  private client: RingHubClient | null
  private userId: string
  private userClient: RingHubClient | null = null

  constructor(userId: string) {
    this.client = getRingHubClient() // Server client (for fallback)
    this.userId = userId
  }

  /**
   * Get or create a user-authenticated Ring Hub client
   */
  private async getUserClient(): Promise<RingHubClient> {
    if (this.userClient) {
      return this.userClient
    }

    // Get user's DID data
    const userDIDMapping = await getOrCreateUserDID(this.userId)
    
    // Check if we can use user DID directly (production with resolvable domain)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const isLocalhost = baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')
    
    if (isLocalhost) {
      console.log(`⚠️ Development mode: Using server DID proxy for Ring Hub authentication`)
      console.log(`User intent tracked locally for: ${userDIDMapping.did}`)
      
      // In development, use server DID but track user intent locally
      if (!this.client) {
        throw new Error('Ring Hub client not available')
      }
      return this.client
    }
    
    // In production, use user's DID directly (DID documents are now published)
    console.log(`✅ Production mode: User ${userDIDMapping.did} authenticating directly to Ring Hub`)
    console.log(`DID document available at: /.well-known/did/users/${userDIDMapping.userHash}/did.json`)
    
    // Convert base64url public key to multibase format for Ring Hub
    const publicKeyMultibase = publicKeyToMultibase(userDIDMapping.publicKey)
    
    this.userClient = new RingHubClient({
      baseUrl: process.env.RING_HUB_URL!,
      instanceDID: userDIDMapping.did,
      privateKeyBase64Url: userDIDMapping.secretKey,
      publicKeyMultibase: publicKeyMultibase
    })

    console.log(`Created user-authenticated Ring Hub client for ${userDIDMapping.did}`)
    return this.userClient
  }

  /**
   * Ensure user has a DID and return it
   */
  private async ensureUserDID(): Promise<string> {
    try {
      console.log('Ensuring user DID for userId:', this.userId);
      const userDIDMapping = await getOrCreateUserDID(this.userId);
      console.log('User DID mapping:', userDIDMapping);
      return userDIDMapping.did;
    } catch (error) {
      console.error('Failed to ensure user DID:', error);
      throw error;
    }
  }


  /**
   * Join a ring as this user (dev: server proxy, prod: user DID)
   */
  async joinRing(slug: string, message?: string): Promise<RingMember> {
    console.log(`Starting join operation for ring: ${slug}`)
    
    const userClient = await this.getUserClient()
    const userDID = await this.ensureUserDID()
    
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const isLocalhost = baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')
    
    if (isLocalhost) {
      console.log(`User ${userDID} joining ring ${slug} via server DID proxy (dev mode)`)
    } else {
      console.log(`User ${userDID} joining ring ${slug} with direct authentication (production)`)
    }
    
    try {
      const result = await userClient.joinRing(slug, message)
      console.log('✅ Ring Hub join successful:', result)
      return result
    } catch (error: any) {
      console.error('❌ Ring Hub join error:', {
        message: error.message,
        status: error.status,
        code: error.code
      })
      throw error
    }
  }

  /**
   * Leave a ring as this user (dev: server proxy, prod: user DID)
   */
  async leaveRing(slug: string, reason?: string): Promise<void> {
    const userClient = await this.getUserClient()
    const userDID = await this.ensureUserDID()
    
    console.log(`User ${userDID} leaving ring ${slug}`)
    return await userClient.leaveRing(slug)
  }

  /**
   * Submit a post to a ring as this user (dev: server proxy, prod: user DID)
   */
  async submitPost(ringSlug: string, postSubmission: {
    uri: string
    digest: string
    metadata?: any
  }) {
    const userClient = await this.getUserClient()
    const userDID = await this.ensureUserDID()
    
    const submission = {
      ...postSubmission,
      actorDid: userDID  // Include the user's DID as the actor
    }
    
    console.log(`Submitting post to ring ${ringSlug} as user ${userDID}`)
    return await userClient.submitPost(ringSlug, submission)
  }

  /**
   * Create a ring as this user (by forking from the spool)
   */
  async createRing(ring: Partial<RingDescriptor>): Promise<RingDescriptor> {
    // All ring creation is now done by forking from the spool
    return this.forkRing('spool', ring)
  }

  /**
   * Update a ring as this user (must be curator/have manage_ring permission)
   */
  async updateRing(slug: string, updates: Partial<RingDescriptor>): Promise<RingDescriptor> {
    console.log(`Starting update operation for ring: ${slug}`)
    
    const userClient = await this.getUserClient()
    const userDID = await this.ensureUserDID()
    
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const isLocalhost = baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')
    
    if (isLocalhost) {
      console.log(`User ${userDID} updating ring ${slug} via server DID proxy (dev mode)`)
    } else {
      console.log(`User ${userDID} updating ring ${slug} directly (prod mode)`)
    }
    
    // Update via Ring Hub using user-authenticated client
    // Ring Hub will verify the user has manage_ring permission
    return await userClient.updateRing(slug, updates)
  }

  /**
   * Update ring badge as this user (dev: server proxy, prod: user DID)
   */
  async updateRingBadge(slug: string, updates: {
    badgeImageUrl?: string;
    badgeImageHighResUrl?: string;
    description?: string;
    criteria?: string;
    updateExistingBadges?: boolean;
  }): Promise<{
    success: boolean;
    message: string;
    badgeImageUrl?: string;
    badgeImageHighResUrl?: string;
    description?: string;
    criteria?: string;
    badgesUpdated?: number;
  }> {
    const userClient = await this.getUserClient()
    const userDID = await this.ensureUserDID()
    
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const isLocalhost = baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')
    
    // Update badge via Ring Hub using user-authenticated client
    // Ring Hub will verify the user owns the ring (ownerDid matches actorDid)
    return await userClient.updateRingBadge(slug, updates)
  }

  /**
   * Fork a ring as this user (dev: server proxy, prod: user DID)
   */
  async forkRing(parentSlug: string, forkData: Partial<RingDescriptor>): Promise<RingDescriptor> {
    const userClient = await this.getUserClient()
    const userDIDMapping = await getOrCreateUserDID(this.userId)
    
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const isLocalhost = baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')
    
    // Add user identification to fork metadata
    const enrichedForkData = {
      ...forkData,
      curatorNotes: isLocalhost 
        ? `Created by user ${userDIDMapping.did} via ThreadStead (dev mode)`
        : `Created by user ${userDIDMapping.did} via ThreadStead`
    }
    
    console.log(`User ${userDIDMapping.did} forking ring ${parentSlug}`)
    const forkedRing = await userClient.forkRing(parentSlug, enrichedForkData)
    
    console.log('✅ Fork response from Ring Hub:', forkedRing);
    
    // Track ownership locally for user access control
    // Note: Both Ring Hub and local tracking now show user as actual owner
    await db.ringHubOwnership.create({
      data: {
        ringSlug: forkedRing.slug,
        ringUri: forkedRing.uri || `https://ringhub.io/rings/${forkedRing.slug}`, // Fallback if uri not provided
        ownerUserId: this.userId,
        serverDID: userDIDMapping.did, // User's DID is now the Ring Hub owner too
      }
    })
    
    console.log(`Created Ring Hub fork ownership tracking for user ${this.userId}, ring ${forkedRing.slug}`)
    return forkedRing
  }

  /**
   * Get user's current DID
   */
  async getUserDID(): Promise<string> {
    return await this.ensureUserDID()
  }

  // Pass-through methods that don't require user authentication
  
  async getRing(slug: string): Promise<RingDescriptor | null> {
    return this.client?.getRing(slug) || null
  }

  async listRings(options?: Parameters<RingHubClient['listRings']>[0]) {
    const userClient = await this.getUserClient()
    return await userClient.listRings(options)
  }

  async getRingMembers(slug: string) {
    const userClient = await this.getUserClient()
    
    return await userClient.getRingMembers(slug)
  }

  async getRingFeed(slug: string, options?: Parameters<RingHubClient['getRingFeed']>[1]) {
    if (!this.client) {
      throw new Error('Ring Hub client not available')
    }
    return await this.client.getRingFeed(slug, options)
  }

  async getRingLineage(slug: string) {
    if (!this.client) {
      throw new Error('Ring Hub client not available')
    }
    return await this.client.getRingLineage(slug)
  }

  async getStats() {
    if (!this.client) {
      throw new Error('Ring Hub client not available')
    }
    return await this.client.getStats()
  }

  async getMyMemberships(options?: Parameters<RingHubClient['getMyMemberships']>[0]) {
    try {
      const userClient = await this.getUserClient()
      return await userClient.getMyMemberships(options)
    } catch (error: any) {
      // If this is a new user without Ring Hub identity, return empty memberships
      if (error.status === 401 || error.message?.includes('Authentication required')) {
        console.log(`User ${this.userId} doesn't have Ring Hub identity yet, returning empty memberships`);
        return {
          memberships: [],
          total: 0,
          page: 1,
          limit: options?.limit || 20
        };
      }
      throw error;
    }
  }

  async getMyFeed(options?: Parameters<RingHubClient['getMyFeed']>[0]) {
    const userClient = await this.getUserClient()
    return await userClient.getMyFeed(options)
  }

  async getTrendingFeed(options?: Parameters<RingHubClient['getTrendingFeed']>[0]) {
    if (!this.client) {
      throw new Error('Ring Hub client not available')
    }
    return await this.client.getTrendingFeed(options)
  }

  /**
   * Curate/moderate a post as this user (requires curator/moderator permissions)
   */
  async curatePost(postId: string, action: 'accept' | 'reject' | 'pin' | 'unpin' | 'remove', options?: {
    reason?: string
    metadata?: any
  }) {
    const userClient = await this.getUserClient()
    const userDID = await this.ensureUserDID()
    
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const isLocalhost = baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')
    
    if (isLocalhost) {
      console.log(`User ${userDID} curating post ${postId} with action ${action} via server DID proxy (dev mode)`)
    } else {
      console.log(`User ${userDID} curating post ${postId} with action ${action} directly (prod mode)`)
    }
    
    try {
      const result = await userClient.curatePost(postId, action, options)
      console.log('✅ Ring Hub curation successful:', result)
      return result
    } catch (error: any) {
      console.error('❌ Ring Hub curation error:', {
        message: error.message,
        status: error.status,
        code: error.code
      })
      throw error
    }
  }
}

/**
 * Create an authenticated Ring Hub client for a specific user
 */
export function createAuthenticatedRingHubClient(userId: string): AuthenticatedRingHubClient {
  return new AuthenticatedRingHubClient(userId)
}

/**
 * Utility functions for user DID operations
 */
export class UserDIDUtils {
  
  /**
   * Check if a user has a DID
   */
  static async userHasDID(userId: string): Promise<boolean> {
    try {
      await getUserDID(userId)
      return true
    } catch {
      return false
    }
  }

  /**
   * Get or create DID for user and return basic info
   */
  static async ensureUserDID(userId: string): Promise<{ did: string; created: string }> {
    const mapping = await getOrCreateUserDID(userId)
    return {
      did: mapping.did,
      created: mapping.created
    }
  }

  /**
   * Bulk ensure DIDs for multiple users
   */
  static async ensureMultipleUserDIDs(userIds: string[]): Promise<Map<string, string>> {
    const didMap = new Map<string, string>()
    
    await Promise.all(
      userIds.map(async (userId) => {
        const mapping = await getOrCreateUserDID(userId)
        didMap.set(userId, mapping.did)
      })
    )
    
    return didMap
  }
}

/**
 * Migration utilities for existing ThreadRings
 */
export class ThreadRingMigrationUtils {
  
  /**
   * Migrate existing ThreadRing members to DID system
   */
  static async migrateMembersToDIDs(memberUserIds: string[]): Promise<Map<string, string>> {
    console.log(`Migrating ${memberUserIds.length} ThreadRing members to DID system...`)
    
    const userDIDMap = new Map<string, string>()
    
    for (const userId of memberUserIds) {
      try {
        const mapping = await getOrCreateUserDID(userId)
        userDIDMap.set(userId, mapping.did)
      } catch (error) {
        console.error(`Failed to migrate user ${userId} to DID:`, error)
        // Continue with other users
      }
    }
    
    console.log(`Successfully migrated ${userDIDMap.size} users to DID system`)
    return userDIDMap
  }

  /**
   * Get DID mapping for existing ThreadRing members
   */
  static async getMemberDIDMappings(memberUserIds: string[]): Promise<Array<{ userId: string; did: string }>> {
    const mappings: Array<{ userId: string; did: string }> = []
    
    for (const userId of memberUserIds) {
      try {
        const did = await getUserDID(userId)
        mappings.push({ userId, did })
      } catch (error) {
        console.warn(`User ${userId} does not have a DID yet`)
        // Skip users without DIDs
      }
    }
    
    return mappings
  }
}

export default AuthenticatedRingHubClient