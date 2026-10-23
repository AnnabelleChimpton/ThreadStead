/**
 * Prompt Service - Ring Hub PostRef-based prompt system
 * 
 * This service handles creating, fetching, and managing threadring prompts
 * as special PostRefs in Ring Hub.
 */

import crypto from 'crypto';
import { getRingHubClient } from '../../api/ringhub/ringhub-client';
import { AuthenticatedRingHubClient } from '../../api/ringhub/ringhub-user-operations';
import { RingHubAuthError } from '../../api/ringhub/ringhub-errors';
import { db } from '../../config/database/connection';
import type { 
  PromptPostRefMetadata, 
  PromptResponsePostRefMetadata,
  ThreadRingPostRef,
  ThreadRingPostRefMetadata
} from '@/types/threadrings';
import type { PostRef, RingHubClient } from '../../api/ringhub/ringhub-client';

/** Reads a ring's feed: this site by default, or the viewer for a private ring. */
export type FeedReader = Pick<RingHubClient, 'getRingFeed'>;

/** The hub's largest feed page */
const FEED_PAGE = 100;
/** Pages read at most (2,000 posts), so a huge ring can't hold a request up */
const MAX_FEED_PAGES = 20;

export interface CreatePromptRequest {
  title: string;
  description: string;
  startsAt?: Date;
  endsAt?: Date;
  isActive?: boolean;
  isPinned?: boolean;
  tags?: string[];
  parentPromptId?: string;
}

export interface PromptSearchOptions {
  includeInactive?: boolean;
  includePinned?: boolean;
  limit?: number;
  offset?: number;
  tags?: string[];
  sortBy?: 'newest' | 'oldest' | 'mostResponses' | 'ending';
}

export interface PromptDetails {
  postRef: ThreadRingPostRef;
  prompt: PromptPostRefMetadata['prompt'];
  responses: ThreadRingPostRef[];
  responseCount: number;
}

export class PromptService {
  private ringSlug: string;
  private reader: FeedReader | null;
  private feed: Promise<ThreadRingPostRef[]> | null = null;

  constructor(ringSlug: string, reader: FeedReader | null = getRingHubClient()) {
    this.ringSlug = ringSlug;
    this.reader = reader;
  }

  /**
   * The ring's whole feed, read once per service. Prompts and responses are
   * PostRefs among the ring's posts, and the hub has no filter by type, so
   * one page of the newest posts lost a prompt once enough newer posts came
   * after it.
   */
  private readFeed(): Promise<ThreadRingPostRef[]> {
    const reader = this.reader;
    if (!reader) return Promise.reject(new Error('Ring Hub client not available'));
    this.feed ??= (async () => {
      const posts: ThreadRingPostRef[] = [];
      for (let page = 0; page < MAX_FEED_PAGES; page++) {
        const { posts: batch } = await reader.getRingFeed(this.ringSlug, { limit: FEED_PAGE, offset: page * FEED_PAGE });
        posts.push(...batch.map((postRef) => this.convertPostRefToThreadRingPostRef(postRef)));
        if (batch.length < FEED_PAGE) break;
      }
      return posts;
    })();
    return this.feed;
  }

  /**
   * Create a new prompt as a PostRef in Ring Hub
   */
  async createPrompt(
    userId: string,
    promptData: CreatePromptRequest
  ): Promise<ThreadRingPostRef> {
    const authenticatedClient = new AuthenticatedRingHubClient(userId);
    
    // Generate unique prompt ID
    const promptId = crypto.randomUUID();
    
    // Create prompt URI
    const promptUri = `threadring://prompt/${promptId}`;
    
    // Prepare prompt metadata
    const metadata: PromptPostRefMetadata = {
      type: 'threadring_prompt',
      prompt: {
        promptId,
        title: promptData.title,
        description: promptData.description,
        createdBy: '', // Will be filled by Ring Hub with user's DID
        startsAt: (promptData.startsAt || new Date()).toISOString(),
        endsAt: promptData.endsAt?.toISOString(),
        isActive: promptData.isActive ?? true,
        isPinned: promptData.isPinned ?? false,
        responseCount: 0,
        tags: promptData.tags,
        parentPromptId: promptData.parentPromptId,
        version: 1
      }
    };

    // Generate content hash
    const contentString = JSON.stringify({
      title: promptData.title,
      description: promptData.description,
      promptId,
      timestamp: metadata.prompt.startsAt
    });
    
    const digest = crypto.createHash('sha256').update(contentString).digest('hex');

    // Submit to Ring Hub
    const result = await authenticatedClient.submitPost(this.ringSlug, {
      uri: promptUri,
      digest,
      metadata
    });

    // Convert Ring Hub response to our format
    return {
      id: result.id,
      uri: result.uri,
      digest: result.digest,
      submittedBy: result.submittedBy,
      submittedAt: result.submittedAt,
      isPinned: false, // Prompts use isPinned in metadata, not PostRef level
      status: result.status,
      metadata
    };
  }

  /**
   * Get all prompts for a ring
   */
  async getPrompts(options: PromptSearchOptions = {}): Promise<ThreadRingPostRef[]> {
    let prompts = (await this.readFeed()).filter(
      (postRef) => postRef.metadata?.type === 'threadring_prompt'
    );

    // Apply filters
    if (!options.includeInactive) {
      prompts = prompts.filter(p => 
        p.metadata?.type === 'threadring_prompt' && 
        (p.metadata as PromptPostRefMetadata).prompt.isActive
      );
    }

    if (!options.includePinned) {
      prompts = prompts.filter(p => 
        p.metadata?.type === 'threadring_prompt' && 
        !(p.metadata as PromptPostRefMetadata).prompt.isPinned
      );
    }

    if (options.tags?.length) {
      prompts = prompts.filter(p => {
        const promptMeta = p.metadata as PromptPostRefMetadata;
        return promptMeta.prompt.tags?.some(tag => options.tags!.includes(tag));
      });
    }

    // Sort prompts
    prompts.sort((a, b) => {
      const aMeta = a.metadata as PromptPostRefMetadata;
      const bMeta = b.metadata as PromptPostRefMetadata;

      switch (options.sortBy) {
        case 'oldest':
          return new Date(aMeta.prompt.startsAt).getTime() - new Date(bMeta.prompt.startsAt).getTime();
        case 'mostResponses':
          return bMeta.prompt.responseCount - aMeta.prompt.responseCount;
        case 'ending':
          if (!aMeta.prompt.endsAt && !bMeta.prompt.endsAt) return 0;
          if (!aMeta.prompt.endsAt) return 1;
          if (!bMeta.prompt.endsAt) return -1;
          return new Date(aMeta.prompt.endsAt).getTime() - new Date(bMeta.prompt.endsAt).getTime();
        case 'newest':
        default:
          return new Date(bMeta.prompt.startsAt).getTime() - new Date(aMeta.prompt.startsAt).getTime();
      }
    });

    const offset = options.offset ?? 0;
    return options.limit ? prompts.slice(offset, offset + options.limit) : prompts.slice(offset);
  }

  /**
   * Get a specific prompt by ID
   */
  async getPrompt(promptId: string): Promise<ThreadRingPostRef | null> {
    const prompts = await this.getPrompts({ 
      includeInactive: true,
      includePinned: true  // Include pinned prompts when searching by ID
    });
    
    const found = prompts.find(p => {
      const meta = p.metadata as PromptPostRefMetadata;
      const matches = meta.prompt.promptId === promptId;
      return matches;
    });
    
    
    return found || null;
  }

  /**
   * Get the active prompt for a ring
   */
  async getActivePrompt(): Promise<ThreadRingPostRef | null> {
    const prompts = await this.getPrompts({ includeInactive: false });
    
    // Find active prompt, or most recent pinned prompt
    const activePrompt = prompts.find(p => {
      const meta = p.metadata as PromptPostRefMetadata;
      return meta.prompt.isActive;
    });
    
    if (activePrompt) return activePrompt;
    
    // Fall back to most recent pinned prompt
    const pinnedPrompts = prompts.filter(p => {
      const meta = p.metadata as PromptPostRefMetadata;
      return meta.prompt.isPinned;
    });
    
    return pinnedPrompts[0] || null;
  }

  /**
   * Get responses to a specific prompt
   */
  async getPromptResponses(promptId: string): Promise<ThreadRingPostRef[]> {
    return (await this.readFeed())
      .filter(postRef => 
        postRef.metadata?.type === 'prompt_response' &&
        (postRef.metadata as PromptResponsePostRefMetadata).response.promptId === promptId
      );
  }

  /**
   * Get detailed prompt information including responses
   */
  async getPromptDetails(promptId: string): Promise<PromptDetails | null> {
    const prompt = await this.getPrompt(promptId);
    if (!prompt || prompt.metadata?.type !== 'threadring_prompt') {
      return null;
    }

    const responses = await this.getPromptResponses(promptId);
    
    // Calculate actual response count dynamically since Ring Hub doesn't support metadata updates
    const actualResponseCount = responses.length;
    
    return {
      postRef: prompt,
      prompt: {
        ...(prompt.metadata as PromptPostRefMetadata).prompt,
        responseCount: actualResponseCount // Use actual count instead of stale metadata
      },
      responses,
      responseCount: actualResponseCount
    };
  }

  /**
   * Update a prompt's response count (this is a workaround since Ring Hub doesn't support direct PostRef updates)
   */
  async updatePromptResponseCount(promptId: string): Promise<void> {
    try {
      // Get current responses
      const responses = await this.getPromptResponses(promptId);

            
      // Note: Ring Hub doesn't currently support updating PostRef metadata
      // The response count will be calculated dynamically for now
      // This could be implemented with Ring Hub curation features in the future
      
    } catch (error) {
      console.error('Error updating prompt response count:', error);
    }
  }

  /**
   * Mark a post as a response to a prompt and update response count
   */
  async associatePostWithPrompt(
    userId: string,
    postUri: string,
    promptId: string,
    promptTitle: string,
    responseType: 'direct' | 'inspired_by' | 'continuation' = 'direct'
  ): Promise<void> {    
    // Update the response count after the association
    await this.updatePromptResponseCount(promptId);
  }

  /**
   * Delete a prompt (soft delete via Ring Hub curation)
   */
  async deletePrompt(
    userId: string,
    promptId: string,
    reason?: string
  ): Promise<void> {
    // Get the prompt PostRef
    const prompt = await this.getPrompt(promptId);

    if (!prompt) {
      throw new Error('Prompt not found');
    }

    // Verify it's actually a prompt
    if (prompt.metadata?.type !== 'threadring_prompt') {
      throw new Error('Not a valid prompt');
    }

    // Check if already deleted
    if (prompt.status === 'REMOVED') {
      throw new Error('Prompt already deleted');
    }

    // Ensure we have a Ring Hub ID for curation
    if (!prompt.id) {
      throw new Error('Prompt missing Ring Hub ID - cannot delete');
    }

    // Create authenticated client for the user
    const authenticatedClient = new AuthenticatedRingHubClient(userId);

    // Get user's DID for authorization checks
    const userDID = await authenticatedClient.getUserDID();
    const promptMetadata = prompt.metadata as PromptPostRefMetadata;

    // Note: We check locally but Ring Hub will also validate permissions
    // Ring Hub returns 403 if user lacks permission
    // User can delete if they are the creator OR have curator/moderator role

    try {
      // Delete the prompt via Ring Hub curation
      await authenticatedClient.curatePost(
        prompt.id,
        'remove',
        {
          reason: reason || 'Prompt deleted',
          metadata: {
            deletedAt: new Date().toISOString(),
            deletedBy: userDID
          }
        }
      );
    } catch (error: any) {
      // Re-throw with better error messages
      if (error.status === 403) {
        throw new Error('Permission denied - only prompt creator or ring moderators can delete prompts');
      }
      if (error.status === 404) {
        throw new Error('Prompt not found in Ring Hub');
      }
      throw error;
    }
  }

  /**
   * Convert Ring Hub PostRef to ThreadRing PostRef format
   */
  private convertPostRefToThreadRingPostRef(postRef: PostRef): ThreadRingPostRef {
    return {
      id: postRef.id,
      uri: postRef.uri,
      digest: postRef.digest,
      submittedBy: postRef.submittedBy,
      submittedAt: postRef.submittedAt,
      isPinned: postRef.isPinned,
      status: postRef.status,
      moderatedAt: postRef.moderatedAt,
      moderatedBy: postRef.moderatedBy,
      moderationNote: postRef.moderationNote,
      metadata: postRef.metadata as ThreadRingPostRefMetadata
    };
  }

  /**
   * Validate prompt data before creation
   */
  private validatePromptData(data: CreatePromptRequest): void {
    if (!data.title || data.title.trim().length === 0) {
      throw new Error('Prompt title is required');
    }
    
    if (data.title.length > 200) {
      throw new Error('Prompt title must be 200 characters or less');
    }
    
    if (!data.description || data.description.trim().length === 0) {
      throw new Error('Prompt description is required');
    }
    
    if (data.description.length > 1000) {
      throw new Error('Prompt description must be 1000 characters or less');
    }
    
    if (data.endsAt && data.startsAt && data.endsAt <= data.startsAt) {
      throw new Error('End date must be after start date');
    }
  }
}

/**
 * Who reads a ring's feed for prompts: the viewer, when they have a key here,
 * so a private ring's members see its prompts; this site otherwise, or when
 * the viewer's key is stale.
 */
export async function promptFeedReader(viewerId: string | null | undefined): Promise<FeedReader | null> {
  const site = getRingHubClient();
  if (!viewerId) return site;
  const key = await db.userDID.findUnique({ where: { userId: viewerId }, select: { did: true } });
  if (!key) return site;
  const member = new AuthenticatedRingHubClient(viewerId);
  return {
    getRingFeed: (slug, options) =>
      member.getRingFeedAsMember(slug, options).catch((error) => {
        if (error instanceof RingHubAuthError && site) return site.getRingFeed(slug, options);
        throw error;
      }),
  };
}

/**
 * Helper function to create a PromptService instance
 */
export function createPromptService(ringSlug: string, reader?: FeedReader | null): PromptService {
  return new PromptService(ringSlug, reader);
}

/**
 * Helper function to check if a PostRef is a prompt
 */
export function isPromptPostRef(postRef: ThreadRingPostRef): postRef is ThreadRingPostRef & { metadata: PromptPostRefMetadata } {
  return postRef.metadata?.type === 'threadring_prompt';
}

/**
 * Helper function to check if a PostRef is a prompt response
 */
export function isPromptResponsePostRef(postRef: ThreadRingPostRef): postRef is ThreadRingPostRef & { metadata: PromptResponsePostRefMetadata } {
  return postRef.metadata?.type === 'prompt_response';
}

/**
 * Helper function to extract prompt metadata safely
 */
export function getPromptMetadata(postRef: ThreadRingPostRef): PromptPostRefMetadata['prompt'] | null {
  if (!isPromptPostRef(postRef)) return null;
  return postRef.metadata.prompt;
}

/**
 * Helper function to extract prompt response metadata safely
 */
export function getPromptResponseMetadata(postRef: ThreadRingPostRef): PromptResponsePostRefMetadata['response'] | null {
  if (!isPromptResponsePostRef(postRef)) return null;
  return postRef.metadata.response;
}