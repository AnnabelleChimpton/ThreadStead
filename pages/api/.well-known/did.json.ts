/**
 * DID Document endpoint for did:web resolution
 * 
 * This endpoint serves the DID document for ThreadStead's did:web identity
 * Required for Ring Hub to verify ThreadStead's identity and public keys
 * 
 * Endpoint: /.well-known/did.json
 * Supports: did:web:domain -> https://domain/.well-known/did.json
 */

import { NextApiRequest, NextApiResponse } from 'next'
import { generateDIDDocument, initializeServerDID } from '@/lib/api/did/server-did-client'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Ensure server DID is initialized
    await initializeServerDID()
    
    // Generate the DID document
    const didDocument = await generateDIDDocument()
    
    // Set proper content type and CORS headers for DID resolution
    res.setHeader('Content-Type', 'application/did+json')
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    
    // Cache for 1 hour (DID documents should be relatively stable)
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600')
    
    return res.status(200).json(didDocument)
    
  } catch (error) {
    console.error('Failed to generate DID document:', error)
    return res.status(500).json({ 
      error: 'Failed to generate DID document',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}