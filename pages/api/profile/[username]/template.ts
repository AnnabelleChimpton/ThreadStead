import type { NextApiRequest, NextApiResponse } from 'next';
import { getSessionUser } from '@/lib/auth/server';
import { db } from "@/lib/config/database/connection";
import { Prisma } from '@prisma/client';
import { compileTemplate } from '@/lib/templates/compilation/template-parser';
import { identifyIslandsWithTransform } from '@/lib/templates/compilation/compiler/island-detector';
import { generateStaticHTML } from '@/lib/templates/compilation/compiler/html-optimizer';

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

      const { template, customCSS, cssMode } = req.body;
      
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

      if (typeof template !== 'string') {
        return res.status(400).json({ error: 'Invalid template data' });
      }

      // Debug: Check positioning data in template being saved
      const hasPositioningInTemplate = template.includes('data-positioning-mode') || template.includes('data-pixel-position');

      if (hasPositioningInTemplate) {
        const positioningMatches = template.match(/data-(?:positioning-mode|pixel-position|position)="[^"]*"/g);
      }

      // Compile the template using our fixed compilation pipeline
      let compiledResult;
      try {
        // Parse the template AST
        const parseResult = compileTemplate(template);

        if (!parseResult.success) {
          console.error('Template compilation failed:', parseResult.errors);
          return res.status(400).json({ error: 'Template compilation failed' });
        }

        // Detect islands (components) in the template using the AST
        const islandResult = identifyIslandsWithTransform(parseResult.ast!);

        // Generate static HTML with component placeholders
        const staticHTML = generateStaticHTML(islandResult.transformedAst, islandResult.islands);

        // Debug: Check positioning data in final static HTML
        const hasPositioningInStaticHTML = staticHTML.includes('data-positioning-mode') ||
                                          staticHTML.includes('data-pixel-position') ||
                                          staticHTML.includes('data-position');

        if (hasPositioningInTemplate && !hasPositioningInStaticHTML) {
          console.error('🚨 [TEMPLATE_SAVE_API] POSITIONING DATA LOST during compilation!');
        }
        
        // Create compiled result structure that matches what the renderer expects
        compiledResult = {
          mode: 'advanced',
          staticHTML: staticHTML,
          islands: islandResult.islands,
          fallback: undefined,
          compiledAt: new Date(),
          errors: [],
          warnings: [],
          // Keep additional data for compatibility
          ast: islandResult.transformedAst,
          validation: parseResult.validation
        };
        
      } catch (compileError) {
        console.error('Template compilation failed:', compileError);
        return res.status(400).json({ error: 'Template compilation failed' });
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

      // Update or create profile with compiled template and islands data
      await db.profile.upsert({
        where: { userId: handle.user.id },
        update: {
          customTemplate: template,
          customTemplateAst: JSON.stringify(compiledResult),
          // Save the compiled template for Islands architecture
          compiledTemplate: JSON.parse(JSON.stringify(compiledResult)),
          templateIslands: JSON.parse(JSON.stringify(compiledResult.islands || null)),
          templateCompiledAt: new Date(),
          ...(processedCSS !== undefined && { customCSS: processedCSS }),
          ...(cssMode !== undefined && { 
            includeSiteCSS: cssMode !== 'disable'
            // Note: cssMode is stored in customCSS as a comment for now
          })
        },
        create: {
          userId: handle.user.id,
          customTemplate: template,
          customTemplateAst: JSON.stringify(compiledResult),
          // Save the compiled template for Islands architecture
          compiledTemplate: JSON.parse(JSON.stringify(compiledResult)),
          templateIslands: JSON.parse(JSON.stringify(compiledResult.islands || null)),
          templateCompiledAt: new Date(),
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