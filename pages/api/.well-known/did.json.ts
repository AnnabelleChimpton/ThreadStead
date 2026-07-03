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
import { generateDIDDocument } from '@/lib/api/did/server-did-client'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Generate the DID document from the env-derived server identity.
    // NOTE: we intentionally do NOT call initializeServerDID() here — that path
    // auto-generates a random keypair when the file is missing, which on a fresh
    // deploy would publish a key unrelated to the signing key. generateDIDDocument()
    // derives the published key from env (the same key used to sign hub requests)
    // and fails loudly if no identity is configured.
    const didDocument = await generateDIDDocument()

    // Set proper content type and CORS headers for DID resolution
    res.setHeader('Content-Type', 'application/did+json')
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

    // Short cache so a rotated key isn't served stale from a CDN for an hour.
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300')

    return res.status(200).json(didDocument)

  } catch (error) {
    console.error('Failed to generate DID document:', error)
    return res.status(500).json({ 
      error: 'Failed to generate DID document',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}