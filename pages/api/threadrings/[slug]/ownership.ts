import { NextApiRequest, NextApiResponse } from 'next';
import { getSessionUser } from '@/lib/auth/server';
import { getUserDID } from '@/lib/api/did/server-did-client';
import { ringOwnerSource, RingOwnerSource } from '@/lib/domain/threadrings/ring-owner';

/**
 * Check ThreadRing Ownership
 * 
 * Determines if the current user has ownership/curator rights for a ThreadRing
 * This includes both local ownership (Ring Hub off) and Ring Hub ownership
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

    // With Ring Hub on, only the hub's owner counts; a mirror row's local
    // curatorId is just whoever posted there first (see ring-owner.ts).
    let ownershipSource: RingOwnerSource | null = null;
    try {
      ownershipSource = await ringOwnerSource(slug, viewer.id);
    } catch (error) {
      console.warn('Error checking ring ownership:', error);
    }
    const isOwner = ownershipSource !== null;
    const isCurator = ownershipSource === 'local_threadring';

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