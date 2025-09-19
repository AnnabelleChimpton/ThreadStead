import type { NextApiRequest, NextApiResponse } from 'next';
import { getSessionUser } from '@/lib/auth/server';
import { db } from '@/lib/config/database/connection';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const user = await getSessionUser(req as any);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    switch (req.method) {
      case 'GET':
        return await getCollections(req, res, user.id);
      case 'POST':
        return await createCollection(req, res, user.id);
      case 'PUT':
        return await updateCollection(req, res, user.id);
      case 'DELETE':
        return await deleteCollection(req, res, user.id);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Collections API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function getCollections(req: NextApiRequest, res: NextApiResponse, userId: string) {
  const collections = await db.userCollection.findMany({
    where: { userId },
    include: {
      _count: {
        select: { bookmarks: true }
      }
    },
    orderBy: [
      { isDefault: 'desc' }, // Default collection first
      { createdAt: 'asc' }
    ]
  });

  return res.json({
    success: true,
    collections: collections.map(collection => ({
      id: collection.id,
      name: collection.name,
      description: collection.description,
      visibility: collection.visibility,
      isDefault: collection.isDefault,
      bookmarkCount: collection._count.bookmarks,
      createdAt: collection.createdAt,
      updatedAt: collection.updatedAt
    }))
  });
}

async function createCollection(req: NextApiRequest, res: NextApiResponse, userId: string) {
  const { name, description, visibility = 'private' } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Collection name is required' });
  }

  // Check if collection name already exists for user
  const existing = await db.userCollection.findFirst({
    where: {
      userId,
      name
    }
  });

  if (existing) {
    return res.status(409).json({ error: 'Collection with this name already exists' });
  }

  const collection = await db.userCollection.create({
    data: {
      userId,
      name,
      description,
      visibility,
      isDefault: false // Only system can create default collections
    }
  });

  return res.json({
    success: true,
    collection: {
      id: collection.id,
      name: collection.name,
      description: collection.description,
      visibility: collection.visibility,
      isDefault: collection.isDefault,
      bookmarkCount: 0,
      createdAt: collection.createdAt,
      updatedAt: collection.updatedAt
    }
  });
}

async function updateCollection(req: NextApiRequest, res: NextApiResponse, userId: string) {
  const { id, name, description, visibility } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Collection ID is required' });
  }

  // Verify ownership
  const collection = await db.userCollection.findFirst({
    where: {
      id,
      userId
    }
  });

  if (!collection) {
    return res.status(404).json({ error: 'Collection not found' });
  }

  // Don't allow renaming default collection
  if (collection.isDefault && name && name !== collection.name) {
    return res.status(400).json({ error: 'Cannot rename default collection' });
  }

  const updated = await db.userCollection.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(description !== undefined && { description }),
      ...(visibility && { visibility })
    }
  });

  return res.json({
    success: true,
    collection: {
      id: updated.id,
      name: updated.name,
      description: updated.description,
      visibility: updated.visibility,
      isDefault: updated.isDefault,
      updatedAt: updated.updatedAt
    }
  });
}

async function deleteCollection(req: NextApiRequest, res: NextApiResponse, userId: string) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Collection ID is required' });
  }

  // Verify ownership and check if it's default
  const collection = await db.userCollection.findFirst({
    where: {
      id,
      userId
    }
  });

  if (!collection) {
    return res.status(404).json({ error: 'Collection not found' });
  }

  if (collection.isDefault) {
    return res.status(400).json({ error: 'Cannot delete default collection' });
  }

  // Move bookmarks to default collection before deleting
  const defaultCollection = await db.userCollection.findFirst({
    where: {
      userId,
      isDefault: true
    }
  });

  if (defaultCollection) {
    await db.userBookmark.updateMany({
      where: { collectionId: id },
      data: { collectionId: defaultCollection.id }
    });
  }

  await db.userCollection.delete({
    where: { id }
  });

  return res.json({ success: true });
}