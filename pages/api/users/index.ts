import type { NextApiRequest, NextApiResponse } from 'next'
import { loadUserDIDMappings } from '@/lib/api/did/server-did-client'

/**
 * User DIDs Directory Endpoint
 * 
 * Lists all published user DIDs (for debugging/admin purposes)
 * GET /users -> List of user DID hashes and DIDs
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  try {
    // Load all user DID mappings
    const mappings = await loadUserDIDMappings()
    
    // Return public info only (no private keys or user IDs)
    const publicMappings = mappings.map(mapping => ({
      hash: mapping.userHash,
      did: mapping.did,
      created: mapping.created,
      didDocument: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/users/${mapping.userHash}/did.json`
    }))

    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Cache-Control', 'public, max-age=300') // Cache for 5 minutes
    
    return res.status(200).json({
      message: 'ThreadStead User DID Directory',
      totalUsers: publicMappings.length,
      users: publicMappings
    })

  } catch (error) {
    console.error('Error serving user DID directory:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to load user DID directory'
    })
  }
}