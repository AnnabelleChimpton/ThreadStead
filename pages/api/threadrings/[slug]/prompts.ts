import type { NextApiRequest, NextApiResponse } from 'next'
import { getSessionUser } from '@/lib/auth-server'
import { createPromptService } from '@/lib/prompt-service'
import { withThreadRingSupport } from '@/lib/ringhub-middleware'

export default withThreadRingSupport(async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  system: 'ringhub' | 'local'
) {
  const { slug } = req.query

  if (typeof slug !== 'string') {
    return res.status(400).json({ error: 'Invalid slug parameter' })
  }

  const viewer = await getSessionUser(req)

  // Ring Hub system - use PostRef-based prompts
  if (system === 'ringhub') {
    const promptService = createPromptService(slug)

    if (req.method === 'GET') {
      try {
        console.log(`🎯 Fetching prompts for ring: ${slug}`);
        console.log(`📍 Ring Hub API call starting for ring: ${slug}`);
        
        const prompts = await promptService.getPrompts({
          includeInactive: false,
          includePinned: true,
          limit: 50
        })

        console.log(`📝 Raw prompts from Ring Hub:`, JSON.stringify(prompts, null, 2));
        console.log(`📝 Found ${prompts.length} prompts from Ring Hub:`, prompts.map(p => ({
          id: p.id,
          uri: p.uri,
          metadataType: p.metadata?.type,
          promptId: (p.metadata as any)?.prompt?.promptId
        })));

        // Transform to match old API format for frontend compatibility
        const response = prompts.map(postRef => {
          if (postRef.metadata?.type !== 'threadring_prompt') {
            console.log(`⚠️ Skipping non-prompt PostRef: ${postRef.id} (type: ${postRef.metadata?.type})`);
            return null
          }

          const promptMeta = postRef.metadata.prompt
          console.log(`✅ Processing prompt: ${promptMeta.promptId}`, promptMeta);
          
          return {
            id: promptMeta.promptId,
            title: promptMeta.title,
            description: promptMeta.description,
            startsAt: promptMeta.startsAt,
            endsAt: promptMeta.endsAt,
            isActive: promptMeta.isActive,
            isPinned: promptMeta.isPinned,
            responseCount: 0, // Will be calculated dynamically below
            createdById: promptMeta.createdById,
            createdBy: {
              id: promptMeta.createdBy,
              // Note: DID-based user info would need resolution
              handles: [],
              profile: { displayName: null }
            },
            createdAt: postRef.submittedAt,
            updatedAt: postRef.submittedAt
          }
        }).filter(Boolean)

        // Calculate actual response counts dynamically for each prompt
        console.log(`📊 Calculating response counts for ${response.length} prompts...`);
        for (const prompt of response) {
          if (!prompt) continue; // Skip null entries
          try {
            const responses = await promptService.getPromptResponses(prompt.id);
            const actualCount = responses.length;
            prompt.responseCount = actualCount;
            console.log(`📊 Prompt ${prompt.id}: ${actualCount} responses`);
          } catch (error) {
            console.log(`⚠️ Could not get response count for prompt ${prompt.id}, keeping 0`);
          }
        }

        console.log(`📤 Sending ${response.length} processed prompts to frontend`);
        
        // Prevent caching of prompt data
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        
        return res.status(200).json(response)
      } catch (error) {
        console.error('Error fetching prompts:', error)
        return res.status(500).json({ error: 'Failed to fetch prompts' })
      }
    }

    if (req.method === 'POST') {
      // Create a new prompt
      if (!viewer) {
        return res.status(401).json({ error: 'Authentication required' })
      }

      try {
        const { title, description, endsAt, isActive, isPinned } = req.body

        // Validate input
        if (!title || typeof title !== 'string' || title.trim().length === 0) {
          return res.status(400).json({ error: 'Title is required' })
        }

        if (!description || typeof description !== 'string' || description.trim().length === 0) {
          return res.status(400).json({ error: 'Description is required' })
        }

        if (title.length > 200) {
          return res.status(400).json({ error: 'Title must be 200 characters or less' })
        }

        if (description.length > 1000) {
          return res.status(400).json({ error: 'Description must be 1000 characters or less' })
        }

        // TODO: Check if user is curator/moderator of the ring
        // This would require checking Ring Hub membership

        const promptData = {
          title: title.trim(),
          description: description.trim(),
          startsAt: new Date(),
          endsAt: endsAt ? new Date(endsAt) : undefined,
          isActive: isActive ?? true,
          isPinned: isPinned ?? false
        }

        const prompt = await promptService.createPrompt(viewer.id, promptData)

        // Transform response to match old API format
        if (prompt.metadata?.type === 'threadring_prompt') {
          const promptMeta = prompt.metadata.prompt
          
          const response = {
            id: promptMeta.promptId,
            title: promptMeta.title,
            description: promptMeta.description,
            startsAt: promptMeta.startsAt,
            endsAt: promptMeta.endsAt,
            isActive: promptMeta.isActive,
            isPinned: promptMeta.isPinned,
            responseCount: promptMeta.responseCount,
            createdById: promptMeta.createdById,
            createdBy: {
              id: promptMeta.createdBy,
              handles: [],
              profile: { displayName: null }
            },
            createdAt: prompt.submittedAt,
            updatedAt: prompt.submittedAt
          }

          return res.status(201).json(response)
        }

        return res.status(500).json({ error: 'Failed to create prompt' })
      } catch (error) {
        console.error('Error creating prompt:', error)
        
        if (error instanceof Error && error.message.includes('Ring Hub')) {
          return res.status(400).json({ error: error.message })
        }
        
        return res.status(500).json({ error: 'Failed to create prompt' })
      }
    }

    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Local system fallback (deprecated)
  return res.status(404).json({ error: 'Local prompt system no longer supported' })
})