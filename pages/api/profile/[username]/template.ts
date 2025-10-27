import type { NextApiRequest, NextApiResponse } from 'next';
import { getSessionUser } from '@/lib/auth/server';
import { db } from "@/lib/config/database/connection";
import { Prisma } from '@prisma/client';
import { compileTemplate } from '@/lib/templates/compilation/template-parser';
import { identifyIslandsWithTransform } from '@/lib/templates/compilation/compiler/island-detector';
import { generateStaticHTML } from '@/lib/templates/compilation/compiler/html-optimizer';
import { stripNavigationFromTemplate } from '@/lib/templates/utils/navigation-stripper';
import { parseTemplateError, formatTemplateErrorForAPI } from '@/lib/templates/errors/template-error-handler';
import { getCompiledTemplateWithMetrics, getCacheStats } from '@/lib/templates/compilation/template-cache';

import { SITE_NAME } from '@/lib/config/site/constants';
import { withCsrfProtection } from "@/lib/api/middleware/withCsrfProtection";
import { withRateLimit } from "@/lib/api/middleware/withRateLimit";



async function handler(req: NextApiRequest, res: NextApiResponse) {
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

      if (typeof template !== 'string') {
        return res.status(400).json({ error: 'Invalid template data' });
      }

      // Strip navigation components from template - they're NOT stored in HTML
      const cleanedTemplate = stripNavigationFromTemplate(template);

      // Debug: Check positioning data in template being saved
      const hasPositioningInTemplate = cleanedTemplate.includes('data-positioning-mode') || cleanedTemplate.includes('data-pixel-position');

      if (hasPositioningInTemplate) {
        const positioningMatches = cleanedTemplate.match(/data-(?:positioning-mode|pixel-position|position)="[^"]*"/g);
      }

      // Compile the template using cached compilation pipeline
      let compiledResult;
      try {
        const startTime = performance.now();

        // Use cached compilation wrapper - this will hit cache on repeat saves
        const { ast, islands, staticHTML } = await getCompiledTemplateWithMetrics(
          cleanedTemplate,
          async () => {
            // This function only runs on cache MISS (first compilation)

            // Parse the template AST (using cleaned template)
            const parseResult = compileTemplate(cleanedTemplate);

            if (!parseResult.success) {
              console.error('Template compilation failed:', parseResult.errors);

              // Parse and format the error for users
              const firstError = parseResult.errors?.[0] || 'Template compilation failed';
              const templateError = parseTemplateError(firstError);
              const formattedError = formatTemplateErrorForAPI(templateError);

              // Throw error to prevent caching failed compilations
              throw new Error(JSON.stringify(formattedError));
            }

            // Detect islands (components) in the template using the AST
            const islandResult = identifyIslandsWithTransform(parseResult.ast!);

            // Generate static HTML with component placeholders
            const staticHTML = generateStaticHTML(islandResult.transformedAst, islandResult.islands);

            return {
              ast: islandResult.transformedAst,
              islands: islandResult.islands,
              staticHTML
            };
          }
        );

        // Debug: Check positioning data in final static HTML
        const hasPositioningInStaticHTML = staticHTML.includes('data-positioning-mode') ||
                                          staticHTML.includes('data-pixel-position') ||
                                          staticHTML.includes('data-position');

        if (hasPositioningInTemplate && !hasPositioningInStaticHTML) {
          console.error('🚨 [TEMPLATE_SAVE_API] POSITIONING DATA LOST during compilation!');
        }

        // Create compiled result structure that matches what the renderer expects
        compiledResult = {
          mode: 'advanced' as const,
          staticHTML: staticHTML,
          islands: islands,
          fallback: undefined,
          compiledAt: new Date(),
          errors: [],
          warnings: [],
          // Keep additional data for compatibility
          ast: ast
        };

      } catch (compileError) {
        console.error('Template compilation failed:', compileError);

        // Check if error is already formatted (from cache function)
        try {
          const parsedError = JSON.parse((compileError as Error).message);
          if (parsedError.error) {
            return res.status(400).json(parsedError);
          }
        } catch {
          // Not a JSON error, handle normally
        }

        // Parse and format the error for users
        const templateError = parseTemplateError(compileError as Error);
        const formattedError = formatTemplateErrorForAPI(templateError);

        return res.status(400).json(formattedError);
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
          customTemplate: cleanedTemplate, // Save cleaned template without navigation
          customTemplateAst: JSON.stringify(compiledResult),
          // Save the compiled template for Islands architecture
          compiledTemplate: JSON.parse(JSON.stringify(compiledResult)),
          templateIslands: JSON.parse(JSON.stringify(compiledResult.islands || null)),
          templateCompiledAt: new Date(),
          ...(customCSS !== undefined && { customCSS }),
          ...(cssMode !== undefined && {
            cssMode,
            includeSiteCSS: cssMode !== 'disable'
          })
        },
        create: {
          userId: handle.user.id,
          customTemplate: cleanedTemplate, // Save cleaned template without navigation
          customTemplateAst: JSON.stringify(compiledResult),
          // Save the compiled template for Islands architecture
          compiledTemplate: JSON.parse(JSON.stringify(compiledResult)),
          templateIslands: JSON.parse(JSON.stringify(compiledResult.islands || null)),
          templateCompiledAt: new Date(),
          ...(customCSS !== undefined && { customCSS }),
          ...(cssMode !== undefined && {
            cssMode,
            includeSiteCSS: cssMode !== 'disable'
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

// Apply CSRF protection and rate limiting
export default withRateLimit('template_editing')(withCsrfProtection(handler));