import type { NextApiRequest, NextApiResponse } from 'next'
import { getUserDIDMappingByHash, generateUserDIDDocument } from '@/lib/api/did/server-did-client'

/**
 * User DID Document Endpoint
 * 
 * Publishes user DID documents for did:web resolution
 * GET /users/[hash]/did.json -> User's DID document
 * 
 * This enables Ring Hub to resolve and verify user DIDs
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

    // Generate DID document
    const didDocument = generateUserDIDDocument(userDIDMapping)

    // Set proper headers for DID document
    res.setHeader('Content-Type', 'application/did+json')
    res.setHeader('Cache-Control', 'public, max-age=3600') // Cache for 1 hour
    
    return res.status(200).json(didDocument)

  } catch (error) {
    console.error('Error serving user DID document:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to generate DID document'
    })
  }
}