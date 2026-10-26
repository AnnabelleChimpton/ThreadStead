import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/config/database/connection';
import { apiHandler } from '@/lib/api/handler';
import { validationMessage } from '@/lib/api/validation';
import { z } from 'zod';
import { CollectionVisibility } from '@prisma/client';

/** What pages/bookmarks sends; a name or visibility that wasn't text was a 500 */
const collectionFields = {
  name: z.string().trim().min(1, 'Give the collection a name.').max(100),
  description: z.string().max(500).nullable().optional(),
  visibility: z.enum(CollectionVisibility).optional(),
};
const createSchema = z.object(collectionFields);
const updateSchema = z.object({ ...collectionFields, name: collectionFields.name.optional(), id: z.string().min(1).max(200) });

export default apiHandler(
  { methods: ['GET', 'POST', 'PUT', 'DELETE'], auth: 'user' },
  async (req, res, { user }) => {
    try {
      switch (req.method) {
        case 'GET':
          return await getCollections(req, res, user.id);
        case 'POST':
          return await createCollection(req, res, user.id);
        case 'PUT':
          return await updateCollection(req, res, user.id);
        case 'DELETE':
          return await deleteCollection(req, res, user.id);
      }
    } catch (error) {
      console.error('Collections API error:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

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
  const parsed = createSchema.safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ error: validationMessage(parsed.error.issues) });
  const { name, description, visibility = 'private' } = parsed.data;

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
  const parsed = updateSchema.safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ error: validationMessage(parsed.error.issues) });
  const { id, name, description, visibility } = parsed.data;

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
