import { NextApiRequest, NextApiResponse } from 'next';
import { getSessionUser } from '@/lib/auth/server';
import { db } from '@/lib/db';
import { mapDIDToUserId, getUserDID } from '@/lib/api/did/server-did-client';

/**
 * Check ThreadRing Ownership
 * 
 * Determines if the current user has ownership/curator rights for a ThreadRing
 * This includes both local ownership and Ring Hub ownership
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { slug } = req.query;
  if (typeof slug !== 'string') {
    return res.status(400).json({ error: 'Invalid slug parameter' });
  }

  try {
    // Get current user
    const viewer = await getSessionUser(req as any);
    if (!viewer) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    let isOwner = false;
    let isCurator = false;
    let ownershipSource = null;

    // Check local ThreadRing ownership first
    const localRing = await db.threadRing.findUnique({
      where: { slug },
      include: { curator: true }
    });

    if (localRing) {
      if (localRing.curatorId === viewer.id) {
        isCurator = true;
        isOwner = true;
        ownershipSource = 'local_threadring';
      }
    }

    // Check Ring Hub ownership
    if (!isOwner) {
      try {
        // Check if user owns this ring in Ring Hub via our ownership tracking
        const ringHubOwnership = await db.ringHubOwnership.findUnique({
          where: { ringSlug: slug }
        });

        if (ringHubOwnership && ringHubOwnership.ownerUserId === viewer.id) {
          isOwner = true;
          ownershipSource = 'ringhub_ownership';
        } else if (ringHubOwnership) {
          // Check if the Ring Hub owner DID maps to this user
          const ringHubOwnerUserId = await mapDIDToUserId(ringHubOwnership.serverDID);
          if (ringHubOwnerUserId === viewer.id) {
            isOwner = true;
            ownershipSource = 'ringhub_did_mapping';
          }
        }
      } catch (error) {
        console.warn('Error checking Ring Hub ownership:', error);
      }
    }

    // Get user's DID for additional context
    let userDID = null;
    try {
      userDID = await getUserDID(viewer.id);
    } catch {
      // User doesn't have a DID yet
    }

    return res.json({
      isOwner,
      isCurator,
      ownershipSource,
      userInfo: {
        id: viewer.id,
        did: userDID
      }
    });

  } catch (error) {
    console.error('Error checking ownership:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to check ownership'
    });
  }
}