/**
 * Webhook Signature Verification
 * 
 * Verifies incoming webhook signatures from Ring Hub and other external sources
 */

import * as ed from "@noble/ed25519";
import { fromBase64Url } from "@/lib/utils/encoding/base64url";

export interface WebhookVerificationResult {
  valid: boolean
  error?: string
  signer?: string
  timestamp?: string
}

/**
 * Verify HTTP signature for incoming webhooks
 */
export async function verifyWebhookSignature(
  request: {
    method: string
    url: string
    headers: Record<string, string>
    body?: string
  }
): Promise<WebhookVerificationResult> {
  try {
    const signatureHeader = request.headers['signature'] || request.headers['Signature']
    if (!signatureHeader) {
      return { valid: false, error: 'No signature header found' }
    }

    // Parse signature header
    const sigParams = parseSignatureHeader(signatureHeader)
    if (!sigParams) {
      return { valid: false, error: 'Invalid signature header format' }
    }

    // Reconstruct signature string
    const signatureString = reconstructSignatureString(request, sigParams.headers)
    
    // Get public key for verification
    const publicKey = await getPublicKeyForDID(sigParams.keyId)
    if (!publicKey) {
      return { valid: false, error: `Unknown signing key: ${sigParams.keyId}` }
    }

    // Verify signature
    const signatureBytes = fromBase64Url(sigParams.signature)
    const messageBytes = new TextEncoder().encode(signatureString)
    
    const isValid = await ed.verifyAsync(signatureBytes, messageBytes, publicKey)
    
    return {
      valid: isValid,
      signer: sigParams.keyId,
      timestamp: request.headers['date']
    }
    
  } catch (error) {
    return {
      valid: false,
      error: `Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

/**
 * Parse HTTP signature header
 */
function parseSignatureHeader(header: string): {
  keyId: string
  algorithm: string
  headers: string[]
  signature: string
} | null {
  try {
    const params: Record<string, string> = {}
    
    // Parse comma-separated key=value pairs
    const pairs = header.match(/(\w+)="([^"]+)"/g)
    if (!pairs) return null
    
    for (const pair of pairs) {
      const match = pair.match(/(\w+)="([^"]+)"/)
      if (match) {
        params[match[1]] = match[2]
      }
    }
    
    if (!params.keyId || !params.signature || !params.headers) {
      return null
    }
    
    return {
      keyId: params.keyId,
      algorithm: params.algorithm || 'ed25519',
      headers: params.headers.split(' '),
      signature: params.signature
    }
  } catch (error) {
    return null
  }
}

/**
 * Reconstruct signature string from request and header list
 */
function reconstructSignatureString(
  request: { method: string; url: string; headers: Record<string, string>; body?: string },
  headerList: string[]
): string {
  const lines: string[] = []
  
  for (const headerName of headerList) {
    if (headerName === '(request-target)') {
      const url = new URL(request.url)
      const target = `${request.method.toLowerCase()} ${url.pathname}${url.search}`
      lines.push(`(request-target): ${target}`)
    } else {
      const value = request.headers[headerName] || request.headers[headerName.toLowerCase()]
      if (value !== undefined) {
        lines.push(`${headerName}: ${value}`)
      }
    }
  }
  
  return lines.join('\n')
}

/**
 * Get public key for a DID (simplified - in production, implement full DID resolution)
 */
async function getPublicKeyForDID(did: string): Promise<Uint8Array | null> {
  try {
    if (did.startsWith('did:key:')) {
      // Extract public key from did:key
      const publicKeyB64u = did.replace('did:key:', '')
      return fromBase64Url(publicKeyB64u)
    }
    
    if (did.startsWith('did:web:')) {
      // Resolve did:web by fetching DID document
      const domain = did.replace('did:web:', '').replace(/%3A/g, ':')
      const didDocUrl = `https://${domain}/.well-known/did.json`
      
      const response = await fetch(didDocUrl)
      if (!response.ok) {
        console.warn(`Failed to fetch DID document for ${did}: ${response.status}`)
        return null
      }
      
      const didDoc = await response.json()
      
      // Extract first verification method public key
      if (didDoc.verificationMethod && didDoc.verificationMethod[0]) {
        const vm = didDoc.verificationMethod[0]
        if (vm.publicKeyMultibase) {
          // Remove 'z' prefix and decode
          const publicKeyB64u = vm.publicKeyMultibase.substring(1)
          return fromBase64Url(publicKeyB64u)
        }
      }
      
      return null
    }
    
    // Unknown DID method
    console.warn(`Unsupported DID method: ${did}`)
    return null
    
  } catch (error) {
    console.error(`Failed to resolve public key for ${did}:`, error)
    return null
  }
}

/**
 * Middleware for Express/Next.js to verify webhook signatures
 */
export function createWebhookVerificationMiddleware(options?: {
  required?: boolean
  trustedSenders?: string[]
}) {
  return async (req: any, res: any, next: any) => {
    const required = options?.required ?? true
    const trustedSenders = options?.trustedSenders ?? []
    
    try {
      const verification = await verifyWebhookSignature({
        method: req.method,
        url: req.url,
        headers: req.headers,
        body: typeof req.body === 'string' ? req.body : JSON.stringify(req.body)
      })
      
      // Attach verification result to request
      req.webhookVerification = verification
      
      if (required && !verification.valid) {
        return res.status(401).json({
          error: 'Invalid webhook signature',
          message: verification.error
        })
      }
      
      if (verification.valid && trustedSenders.length > 0) {
        if (!verification.signer || !trustedSenders.includes(verification.signer)) {
          return res.status(403).json({
            error: 'Webhook from untrusted sender',
            signer: verification.signer
          })
        }
      }
      
      next()
      
    } catch (error) {
      console.error('Webhook verification middleware error:', error)
      
      if (required) {
        return res.status(500).json({
          error: 'Webhook verification failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        })
      }
      
      // If not required, continue without verification
      req.webhookVerification = { valid: false, error: 'Verification failed' }
      next()
    }
  }
}

/**
 * Check if a timestamp is within acceptable range (prevent replay attacks)
 */
export function isTimestampValid(timestamp: string, maxAgeSeconds: number = 300): boolean {
  try {
    const requestTime = new Date(timestamp).getTime()
    const now = Date.now()
    const age = (now - requestTime) / 1000
    
    return age >= 0 && age <= maxAgeSeconds
  } catch (error) {
    return false
  }
}

/**
 * Validate webhook payload structure
 */
export function validateWebhookPayload(payload: any, expectedType?: string): boolean {
  if (!payload || typeof payload !== 'object') {
    return false
  }
  
  // Basic webhook structure validation
  if (!payload.timestamp || !payload.event) {
    return false
  }
  
  if (expectedType && payload.event !== expectedType) {
    return false
  }
  
  return true
}