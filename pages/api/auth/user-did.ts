/**
 * User DID Management API
 * 
 * Handles DID generation and mapping for ThreadStead users
 * Enables users to get their DID for Ring Hub operations
 */

import { NextApiRequest, NextApiResponse } from 'next'
import { getSessionUser } from '@/lib/auth-server'
import { getUserDID, getOrCreateUserDID, migrateUserToDID } from '@/lib/server-did-client'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verify user authentication
  const user = await getSessionUser(req)
  if (!user) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  const userId = user.id

  switch (req.method) {
    case 'GET':
      return handleGetUserDID(req, res, userId)
    
    case 'POST':
      return handleCreateOrMigrateUserDID(req, res, userId)
    
    default:
      return res.status(405).json({ error: 'Method not allowed' })
  }
}

/**
 * Get user's DID (GET /api/auth/user-did)
 */
async function handleGetUserDID(req: NextApiRequest, res: NextApiResponse, userId: string) {
  try {
    const userDID = await getUserDID(userId)
    
    return res.status(200).json({
      userId,
      did: userDID,
      hasKey: true // User has a DID and key
    })
    
  } catch (error) {
    console.error('Failed to get user DID:', error)
    return res.status(500).json({ 
      error: 'Failed to get user DID',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

/**
 * Create or migrate user DID (POST /api/auth/user-did)
 */
async function handleCreateOrMigrateUserDID(req: NextApiRequest, res: NextApiResponse, userId: string) {
  const { migrate = false, existingPublicKey } = req.body

  try {
    let userDIDMapping;
    
    if (migrate && existingPublicKey) {
      // Migrate existing user to DID system
      userDIDMapping = await migrateUserToDID(userId, existingPublicKey)
    } else {
      // Create new DID for user
      userDIDMapping = await getOrCreateUserDID(userId)
    }
    
    return res.status(200).json({
      userId: userDIDMapping.userId,
      did: userDIDMapping.did,
      created: userDIDMapping.created,
      migrated: !!migrate
    })
    
  } catch (error) {
    console.error('Failed to create/migrate user DID:', error)
    return res.status(500).json({ 
      error: 'Failed to create/migrate user DID',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}