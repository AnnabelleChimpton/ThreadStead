/**
 * Ring Hub User Operations
 * 
 * High-level utilities for Ring Hub operations that automatically handle
 * user DID mapping and authentication for ThreadStead users
 */

import { getRingHubClient, RingHubClient } from './ringhub-client'
import { getOrCreateUserDID, getUserDID, signMessageAsUser, getServerDID, publicKeyToMultibase } from './server-did-client'
import { db } from './db'
import type { RingDescriptor, RingMember, PostRef } from './ringhub-client'

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
      console.log(`⚠️ Using localhost - Ring Hub can't resolve user DIDs in development`)
      console.log(`User DID: ${userDIDMapping.did}`)
      console.log(`Falling back to server DID for Ring Hub authentication`)
      
      // In development, use server DID but track user intent locally
      if (!this.client) {
        throw new Error('Ring Hub client not available')
      }
      return this.client
    }
    
    // In production, use user's DID directly
    // Convert base64url public key to multibase format for Ring Hub
    const publicKeyMultibase = publicKeyToMultibase(userDIDMapping.publicKey)
    
    this.userClient = new RingHubClient({
      baseUrl: process.env.RING_HUB_URL!,
      instanceDID: userDIDMapping.did,
      privateKeyBase64Url: userDIDMapping.secretKey,
      publicKeyMultibase: publicKeyMultibase
    })

    console.log(`Created user-authenticated Ring Hub client for ${userDIDMapping.did}`)
    console.log(`Using multibase public key: ${publicKeyMultibase.substring(0, 20)}...`)
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
   * Join a ring as this user (using their own DID)
   */
  async joinRing(slug: string, message?: string): Promise<RingMember> {
    console.log(`Starting join operation for ring: ${slug}`)
    
    const userClient = await this.getUserClient()
    const userDID = await this.ensureUserDID()
    
    // Check if we're using localhost (server proxy mode)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const isLocalhost = baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')
    
    if (isLocalhost) {
      console.log(`⚠️ Development mode: Server DID proxy joining ring ${slug} for user ${userDID}`)
      console.log(`Server will authenticate to Ring Hub, but membership is for user ${userDID}`)
      
      // In development, Ring Hub will see the server DID in the HTTP signature.
      // This means Ring Hub thinks the server instance is joining, not the user.
      // For development/testing purposes, this is actually fine - we just need to
      // understand that all development joins appear as the server instance.
      console.log('Note: Ring Hub will record server DID as the joining member')
    } else {
      console.log(`✅ Production mode: User ${userDID} authenticating directly to Ring Hub`)
      console.log(`Ring: ${slug}, Message: ${message || 'none'}`)
    }
    
    try {
      console.log('Calling Ring Hub join API...')
      const result = await userClient.joinRing(slug, message)
      console.log('✅ Ring Hub join successful:', result)
      return result
    } catch (error: any) {
      console.error('❌ Ring Hub join error:', {
        message: error.message,
        status: error.status,
        code: error.code,
        stack: error.stack
      })
      throw error
    }
  }

  /**
   * Leave a ring as this user (using their own DID)
   */
  async leaveRing(slug: string, reason?: string): Promise<void> {
    const userClient = await this.getUserClient()
    
    return await userClient.leaveRing(slug)
  }

  /**
   * Submit a post to a ring as this user
   */
  async submitPost(postRef: Omit<PostRef, 'submittedAt' | 'submittedBy'>): Promise<void> {
    if (!this.client) {
      throw new Error('Ring Hub client not available')
    }

    const userDID = await this.ensureUserDID()
    
    const fullPostRef = {
      ...postRef,
      submittedBy: userDID
    }
    
    return await this.client.submitPost(fullPostRef)
  }

  /**
   * Create a ring as this user (using server DID for stability)
   */
  async createRing(ring: Partial<RingDescriptor>): Promise<RingDescriptor> {
    if (!this.client) {
      throw new Error('Ring Hub client not available')
    }

    // Get server DID for stable ring ownership
    const serverDID = await getServerDID()
    
    // Create ring using server DID (Ring Hub client will handle server auth)
    const createdRing = await this.client.createRing(ring)
    
    // Track ownership locally for user access control
    await db.ringHubOwnership.create({
      data: {
        ringSlug: createdRing.slug,
        ringUri: createdRing.uri,
        ownerUserId: this.userId,
        serverDID: serverDID
      }
    })
    
    console.log(`Created Ring Hub ownership tracking for user ${this.userId}, ring ${createdRing.slug}`)
    return createdRing
  }

  /**
   * Update a ring as this user (must be curator)
   */
  async updateRing(slug: string, updates: Partial<RingDescriptor>): Promise<RingDescriptor> {
    if (!this.client) {
      throw new Error('Ring Hub client not available')
    }

    // Check if user owns this Ring Hub ring locally
    const ownership = await db.ringHubOwnership.findUnique({
      where: { ringSlug: slug },
      include: { owner: true }
    })
    
    if (!ownership || ownership.ownerUserId !== this.userId) {
      throw new Error('Only the ring owner can update settings')
    }
    
    // Update via Ring Hub using server DID (Ring Hub client handles auth)
    return await this.client.updateRing(slug, updates)
  }

  /**
   * Fork a ring as this user
   */
  async forkRing(parentSlug: string, forkData: Partial<RingDescriptor>): Promise<RingDescriptor> {
    const userClient = await this.getUserClient()
    const userDIDMapping = await getOrCreateUserDID(this.userId)
    
    // Check if we're using user DID directly or server proxy
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const isLocalhost = baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')
    const usingServerProxy = isLocalhost
    
    // Add user identification to fork metadata
    const enrichedForkData = {
      ...forkData,
      // Add user DID in curator notes (Ring Hub uses 'curatorNotes' plural)
      curatorNotes: usingServerProxy 
        ? `Created by user ${userDIDMapping.did} via ThreadStead (development mode)`
        : `Created by user ${userDIDMapping.did} via ThreadStead`
    }
    
    // Fork ring (may use server DID in development, user DID in production)
    console.log(`${usingServerProxy ? 'Server proxy for user' : 'User'} ${userDIDMapping.did} forking ring ${parentSlug}`)
    const forkedRing = await userClient.forkRing(parentSlug, enrichedForkData)
    
    console.log('Fork response from Ring Hub:', forkedRing);
    
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
    if (!this.client) {
      throw new Error('Ring Hub client not available')
    }
    return await this.client.listRings(options)
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