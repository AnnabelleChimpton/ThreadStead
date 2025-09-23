// API endpoint for compiling profile templates
import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/config/database/connection';
import { getSessionUser } from '@/lib/auth/server';
import { compileProfile, ProfileRenderContext } from '@/lib/templates/compilation/compiler';
// Note: getResidentData would be imported if it existed

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get current user session
    console.log('COMPILE_API: Getting session user...');
    const sessionUser = await getSessionUser(req);
    console.log('COMPILE_API: Session user:', sessionUser ? { id: sessionUser.id, primaryHandle: sessionUser.primaryHandle } : 'null');

    if (!sessionUser?.id) {
      console.log('COMPILE_API: No valid session user found');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { userId, mode, customCSS, customTemplate, force = false } = req.body;
    console.log('COMPILE_API: Request body:', { userId, mode, customTemplateLength: customTemplate?.length || 0, customCSSLength: customCSS?.length || 0, force });

    // Validate inputs
    if (!userId) {
      console.log('COMPILE_API: userId is missing from request');
      return res.status(400).json({ error: 'userId is required' });
    }

    // Check authorization - users can only compile their own profiles
    if (sessionUser.id !== userId) {
      return res.status(403).json({ error: 'Forbidden - can only compile own profile' });
    }

    // Get user with profile
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        handles: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get primary handle
    const primaryHandle = user.handles.find(h => h.handle === user.primaryHandle)?.handle || 
                         user.handles[0]?.handle;
    
    if (!primaryHandle) {
      return res.status(400).json({ error: 'User has no valid handle' });
    }

    // Check if we need to recompile
    if (!force && user.profile?.templateCompiledAt) {
      const lastModified = user.profile.updatedAt;
      const lastCompiled = user.profile.templateCompiledAt;
      
      if (lastCompiled > lastModified) {
        // Template is up to date
        return res.json({ 
          success: true, 
          message: 'Template is already up to date',
          compiledAt: lastCompiled
        });
      }
    }

    // Get resident data for the user
    // Create basic resident data for compilation
    const residentData = {
      owner: {
        id: user.id,
        handle: primaryHandle,
        displayName: user.profile?.displayName || primaryHandle,
        avatarUrl: user.profile?.avatarUrl || '/assets/default-avatar.gif'
      },
      viewer: { id: sessionUser.id },
      posts: [], // Would be fetched from getPostsForUser if needed
      guestbook: [], // Would be fetched from getGuestbookForUser if needed
      capabilities: user.profile?.bio ? { bio: user.profile.bio } : {},
      images: [],
      profileImages: []
    };

    // Create compilation context
    const context: ProfileRenderContext = {
      user: {
        id: user.id,
        handle: primaryHandle,
        profile: user.profile ? {
          templateMode: mode as any || user.profile.templateMode as any,
          customCSS: customCSS || user.profile.customCSS,
          customTemplate: customTemplate || user.profile.customTemplate,
          customTemplateAst: user.profile.customTemplateAst,
          includeSiteCSS: user.profile.includeSiteCSS,
          hideNavigation: user.profile.hideNavigation
        } : {
          templateMode: mode as any || 'advanced',
          customCSS: customCSS || '',
          customTemplate: customTemplate || '',
          customTemplateAst: null,
          includeSiteCSS: true,
          hideNavigation: false
        }
      },
      residentData
    };

    // Handle different compilation modes with backwards compatibility
    let result;
    
    if (mode === 'advanced' && customTemplate) {
      // For advanced mode with custom template, use direct compilation like production
      try {
        const { compileTemplate } = await import('@/lib/templates/compilation/template-parser');
        const { identifyIslandsWithTransform } = await import('@/lib/templates/compilation/compiler/island-detector');
        const { generateStaticHTML } = await import('@/lib/templates/compilation/compiler/html-optimizer');
        
        // Parse the template AST
        const parseResult = compileTemplate(customTemplate);
        
        if (!parseResult.success) {
          return res.status(400).json({
            success: false,
            errors: parseResult.errors,
            warnings: parseResult.validation?.warnings || []
          });
        }
        
        // Detect islands (components) in the template using the AST
        const islandResult = identifyIslandsWithTransform(parseResult.ast!);
        
        // Generate static HTML with component placeholders
        const staticHTML = generateStaticHTML(islandResult.transformedAst, islandResult.islands);
        
        // Create compiled result structure
        const compiled = {
          mode: 'advanced' as const,
          staticHTML: staticHTML,
          islands: islandResult.islands,
          fallback: undefined,
          compiledAt: new Date(),
          errors: [],
          warnings: parseResult.validation?.warnings || []
        };
        
        result = {
          success: true,
          compiled,
          errors: [],
          warnings: compiled.warnings
        };
        
      } catch (compileError) {
        console.error('Direct advanced template compilation failed:', compileError);
        return res.status(400).json({
          success: false,
          errors: ['Advanced template compilation failed'],
          warnings: []
        });
      }
    } else {
      // For default/enhanced modes or advanced without custom template, use context-based compilation
      result = await compileProfile(context, { 
        mode: mode || 'default' // Use requested mode or default
      });
    }

    if (!result.success) {
      return res.status(400).json({
        success: false,
        errors: result.errors,
        warnings: result.warnings
      });
    }

    // Store compiled template in database
    const updateData = {
      compiledTemplate: result.compiled ? JSON.parse(JSON.stringify(result.compiled)) : null,
      templateIslands: result.compiled?.islands ? JSON.parse(JSON.stringify(result.compiled.islands)) : null,
      templateCompiledAt: new Date()
    };

    await db.profile.update({
      where: { userId },
      data: updateData
    });

    // Return success response
    res.json({
      success: true,
      compiled: result.compiled,
      warnings: result.warnings,
      compiledAt: updateData.templateCompiledAt
    });

  } catch (error) {
    console.error('Profile compilation error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    });
  }
}

// Export types for client usage
export interface CompileProfileRequest {
  userId: string;
  mode?: 'default' | 'enhanced' | 'advanced';
  customCSS?: string;
  customTemplate?: string;
  force?: boolean;
}

export interface CompileProfileResponse {
  success: boolean;
  compiled?: any;
  errors?: string[];
  warnings?: string[];
  compiledAt?: Date;
  message?: string;
}