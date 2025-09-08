import type { NextApiRequest, NextApiResponse } from 'next';
import { getSessionUser } from '@/lib/auth/server';
import { db } from "@/lib/config/database/connection";
import { Prisma } from '@prisma/client';

import { SITE_NAME } from '@/lib/config/site/constants';



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

      const { template, ast, customCSS, cssMode } = req.body;
      
      // Store CSS mode as a comment in the CSS for retrieval
      let processedCSS = customCSS;
      if (customCSS && cssMode) {
        // Add CSS mode as a comment at the beginning if not already present
        if (!customCSS.startsWith('/* CSS_MODE:')) {
          processedCSS = `/* CSS_MODE:${cssMode} */\n${customCSS}`;
        } else {
          // Update existing mode comment
          processedCSS = customCSS.replace(/\/\* CSS_MODE:\w+ \*\//, `/* CSS_MODE:${cssMode} */`);
        }
      }
      
      // Debug logging to see what data we're receiving
      console.log('Template API: Received save request', {
        templateLength: template?.length || 0,
        hasAst: !!ast,
        astType: typeof ast,
        astHasIslands: ast?.islands?.length || 0,
        customCSSLength: customCSS?.length || 0,
        cssMode,
        customCSSPreview: customCSS?.substring(0, 100),
        processedCSSLength: processedCSS?.length || 0,
        processedCSSPreview: processedCSS?.substring(0, 100)
      });

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

      // Update or create profile with template and islands data
      await db.profile.upsert({
        where: { userId: handle.user.id },
        update: {
          customTemplate: template,
          customTemplateAst: ast ? JSON.stringify(ast) : null,
          // Save the full compiled template for Islands architecture
          compiledTemplate: ast || null,
          templateIslands: ast?.islands || null,
          templateCompiledAt: ast ? new Date() : null,
          ...(processedCSS !== undefined && { customCSS: processedCSS }),
          ...(cssMode !== undefined && { 
            includeSiteCSS: cssMode !== 'disable'
            // Note: cssMode is stored in customCSS as a comment for now
          })
        },
        create: {
          userId: handle.user.id,
          customTemplate: template,
          customTemplateAst: ast ? JSON.stringify(ast) : null,
          // Save the full compiled template for Islands architecture
          compiledTemplate: ast || null,
          templateIslands: ast?.islands || null,
          templateCompiledAt: ast ? new Date() : null,
          ...(processedCSS !== undefined && { customCSS: processedCSS }),
          ...(cssMode !== undefined && { 
            includeSiteCSS: cssMode !== 'disable'
            // Note: cssMode is stored in customCSS as a comment for now
          })
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

      // Remove template and islands data from profile
      await db.profile.updateMany({
        where: { userId: handle.user.id },
        data: {
          customTemplate: null,
          customTemplateAst: null,
          compiledTemplate: Prisma.JsonNull,
          templateIslands: Prisma.JsonNull,
          templateCompiledAt: null
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