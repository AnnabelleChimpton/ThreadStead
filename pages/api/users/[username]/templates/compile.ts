import type { NextApiRequest, NextApiResponse } from 'next';
import { getSessionUser } from '@/lib/auth/server';
import { compileTemplate } from '@/lib/templates/compilation/template-parser';
import { identifyIslandsWithTransform } from '@/lib/templates/compilation/compiler/island-detector';
import { generateStaticHTML } from '@/lib/templates/compilation/compiler/html-optimizer';
import { stripNavigationFromTemplate } from '@/lib/templates/utils/navigation-stripper';
import { parseTemplateError, formatTemplateErrorForAPI } from '@/lib/templates/errors/template-error-handler';

/**
 * Template Validation API
 *
 * This endpoint validates and compiles templates WITHOUT saving them.
 * Used by the template editor to provide real-time validation feedback.
 *
 * Returns compilation results including:
 * - Success/failure status
 * - Errors with line numbers and suggestions
 * - Warnings
 * - Stripped components
 * - Template statistics
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { username } = req.query;

    if (typeof username !== 'string') {
      return res.status(400).json({ error: 'Invalid username' });
    }

    // Verify authentication
    const user = await getSessionUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Verify the user is validating their own template
    const currentUsername = user.primaryHandle ? user.primaryHandle.split('@')[0] : null;
    if (currentUsername !== username && user.id !== username) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { template, customCSS, mode } = req.body;

    if (typeof template !== 'string') {
      return res.status(400).json({ error: 'Invalid template data' });
    }

    // Strip navigation components (same as save API)
    const cleanedTemplate = stripNavigationFromTemplate(template);

    // Compile the template to validate it
    try {
      const startTime = performance.now();

      // Parse the template AST
      const parseResult = compileTemplate(cleanedTemplate);

      if (!parseResult.success) {
        console.error('Template validation failed:', parseResult.errors);

        // Parse and format the first error for display
        const firstError = parseResult.errors?.[0] || 'Template compilation failed';
        const templateError = parseTemplateError(firstError);
        const formattedError = formatTemplateErrorForAPI(templateError);

        // Return validation failure with details
        return res.status(400).json({
          success: false,
          errors: parseResult.errors,
          warnings: parseResult.validation?.warnings || [],
          strippedComponents: parseResult.strippedComponents || [],
          validation: parseResult.validation,
          ...formattedError // Include line numbers, suggestions, etc.
        });
      }

      // Detect islands (components) in the template using the AST
      const islandResult = identifyIslandsWithTransform(parseResult.ast!);

      // Generate static HTML with component placeholders
      const staticHTML = generateStaticHTML(islandResult.transformedAst, islandResult.islands);

      const endTime = performance.now();
      const compilationTime = endTime - startTime;

      // Log performance in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`[ValidationAPI] Compilation completed in ${compilationTime.toFixed(0)}ms`);
      }

      // Return successful validation with all details
      return res.status(200).json({
        success: true,
        errors: [],
        warnings: parseResult.validation?.warnings || [],
        strippedComponents: parseResult.strippedComponents || [],
        validation: parseResult.validation,
        compiledTemplate: {
          mode: mode || 'advanced',
          staticHTML,
          islands: islandResult.islands,
          compiledAt: new Date(),
        },
        stats: {
          compilationTime,
          nodeCount: parseResult.validation?.stats?.nodeCount,
          maxDepth: parseResult.validation?.stats?.maxDepth,
          componentCounts: parseResult.validation?.stats?.componentCounts,
        }
      });

    } catch (compileError) {
      console.error('Template validation error:', compileError);

      // Parse and format the error for users
      const templateError = parseTemplateError(compileError as Error);
      const formattedError = formatTemplateErrorForAPI(templateError);

      return res.status(400).json({
        success: false,
        errors: [formattedError.error || 'Template compilation failed'],
        warnings: [],
        ...formattedError
      });
    }

  } catch (error) {
    console.error('Validation API error:', error);
    return res.status(500).json({
      success: false,
      errors: ['Internal server error during validation'],
      warnings: []
    });
  }
}
