import type { NextApiRequest, NextApiResponse } from 'next'
import { getUserDIDMappingByHash, generateUserDIDDocument } from '@/lib/api/did/server-did-client'
import { db } from '@/lib/config/database/connection'

/**
 * User DID Document Endpoint
 *
 * Publishes privacy-aware user DID documents for did:web resolution
 * GET /did/[hash]/document -> User's DID document
 *
 * This enables Ring Hub to resolve and verify user DIDs, and optionally
 * retrieve profile data if the user's profile visibility is set to public.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const { hash } = req.query
  if (typeof hash !== 'string') {
    return res.status(400).json({ error: 'Invalid hash parameter' })
  }

  try {
    // Find user DID mapping by hash
    const userDIDMapping = await getUserDIDMappingByHash(hash)

    if (!userDIDMapping) {
      return res.status(404).json({
        error: 'DID document not found',
        message: `No user DID found for hash: ${hash}`
      })
    }

    // Check if user account still exists (GDPR compliance - right to be forgotten)
    const user = await db.user.findUnique({
      where: { id: userDIDMapping.userId },
      select: { id: true }
    })

    if (!user) {
      // User deleted - return 404
      return res.status(404).json({
        error: 'DID document not found',
        message: 'User account no longer exists'
      })
    }

    // Generate privacy-aware DID document
    const didDocument = await generateUserDIDDocument(userDIDMapping, db)

    // Set proper headers for DID document
    res.setHeader('Content-Type', 'application/did+json')
    res.setHeader('Cache-Control', 'public, max-age=3600') // Cache for 1 hour
    res.setHeader('Access-Control-Allow-Origin', '*') // Allow cross-origin DID resolution

    return res.status(200).json(didDocument)

  } catch (error) {
    console.error('Error serving user DID document:', error)

    // Don't expose internal errors to federated instances
    return res.status(500).json({
      error: 'Failed to generate DID document',
      message: 'Internal server error'
    })
  }
}