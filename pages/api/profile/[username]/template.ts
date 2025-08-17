import type { NextApiRequest, NextApiResponse } from 'next';
import { getSessionUser } from '@/lib/auth-server';
import { PrismaClient } from '@prisma/client';
import { SITE_NAME } from '@/lib/site-config';

const db = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { username } = req.query;
    
    if (typeof username !== 'string') {
      return res.status(400).json({ error: 'Invalid username' });
    }

    if (req.method === 'GET') {
      // Get existing template
      const user = await getSessionUser(req);
      if (!user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      // Check if user can access this template
      const handle = await db.handle.findFirst({
        where: { handle: username, host: SITE_NAME },
        include: { user: { select: { id: true, primaryHandle: true } } }
      });

      console.log('Handle found:', handle);

      if (!handle) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Only allow access to own template
      const currentUsername = user.primaryHandle ? user.primaryHandle.split('@')[0] : null;
      if (currentUsername !== username && user.id !== handle.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Get template from profile
      const profile = await db.profile.findUnique({
        where: { userId: handle.user.id },
        select: { customTemplate: true }
      });

      return res.status(200).json({
        template: profile?.customTemplate || null
      });

    } else if (req.method === 'POST') {
      // Save template
      const user = await getSessionUser(req);
      if (!user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { template, ast, customCSS } = req.body;

      if (typeof template !== 'string') {
        return res.status(400).json({ error: 'Invalid template data' });
      }

      // Check if user can modify this profile
      const handle = await db.handle.findFirst({
        where: { handle: username, host: SITE_NAME },
        include: { user: { select: { id: true, primaryHandle: true } } }
      });

      if (!handle) {
        return res.status(404).json({ error: 'User not found' });
      }

      const currentUsername = user.primaryHandle ? user.primaryHandle.split('@')[0] : null;
      if (currentUsername !== username && user.id !== handle.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Update or create profile with template
      await db.profile.upsert({
        where: { userId: handle.user.id },
        update: {
          customTemplate: template,
          customTemplateAst: ast ? JSON.stringify(ast) : null,
          ...(customCSS !== undefined && { customCSS })
        },
        create: {
          userId: handle.user.id,
          customTemplate: template,
          customTemplateAst: ast ? JSON.stringify(ast) : null,
          ...(customCSS !== undefined && { customCSS })
        }
      });

      return res.status(200).json({ success: true });

    } else if (req.method === 'DELETE') {
      // Remove template
      const user = await getSessionUser(req);
      if (!user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const handle = await db.handle.findFirst({
        where: { handle: username, host: SITE_NAME },
        include: { user: { select: { id: true, primaryHandle: true } } }
      });

      if (!handle) {
        return res.status(404).json({ error: 'User not found' });
      }

      const currentUsername = user.primaryHandle ? user.primaryHandle.split('@')[0] : null;
      if (currentUsername !== username && user.id !== handle.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Remove template from profile
      await db.profile.updateMany({
        where: { userId: handle.user.id },
        data: {
          customTemplate: null,
          customTemplateAst: null
        }
      });

      return res.status(200).json({ success: true });

    } else {
      res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Template API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}