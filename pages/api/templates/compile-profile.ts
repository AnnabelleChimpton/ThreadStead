// Compiles a profile template for the editor's live preview. A pure
// compile: it never writes. Only POST /api/profile/[username]/template saves
// (it snapshots a revision first); this endpoint used to store each preview
// as the live page, so half-typed templates went public mid-edit.
import { db } from '@/lib/config/database/connection';
import { compileProfile, ProfileRenderContext } from '@/lib/templates/compilation/compiler';
import { apiHandler } from '@/lib/api/handler';
import { sourceTooLong } from '@/lib/templates/limits';
// Note: getResidentData would be imported if it existed

export default apiHandler(
  {
    methods: ['POST'],
    auth: 'user',
    // no CSRF today: callers (EnhancedTemplateEditor, compiler/client.ts) use plain fetch
    csrf: false,
  },
  async (req, res, { user: sessionUser }) => {
    try {
      const { userId, mode, customCSS, customTemplate } = req.body;

      // Validate inputs
      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }
      const tooLong = sourceTooLong('template', customTemplate) ?? sourceTooLong('CSS', customCSS);
      if (tooLong) return res.status(413).json({ error: tooLong });

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
        // For advanced mode with custom template, use the SINGLE compilation
        // entry point (compile-pipeline.ts) — the same one the save path uses.
        try {
          const { compileTemplateToArtifacts } = await import('@/lib/templates/compilation/compile-pipeline');

          const artifacts = compileTemplateToArtifacts(customTemplate);

          // Create compiled result structure
          const compiled = {
            mode: 'advanced' as const,
            staticHTML: artifacts.staticHTML,
            islands: artifacts.islands,
            fallback: undefined,
            compiledAt: new Date(),
            errors: [],
            warnings: artifacts.warnings
          };

          result = {
            success: true,
            compiled,
            errors: [],
            warnings: compiled.warnings,
            strippedComponents: artifacts.strippedComponents
          };

        } catch (compileError) {
          const { TemplateCompilationError } = await import('@/lib/templates/compilation/compile-pipeline');
          if (compileError instanceof TemplateCompilationError) {
            // Full error list, not a generic message — same contract as the
            // save path, so the editor can show real diagnostics.
            return res.status(400).json({
              success: false,
              errors: compileError.errors,
              warnings: compileError.warnings
            });
          }
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

      // Nothing is stored: the preview shows this, the live page doesn't change
      res.json({
        success: true,
        compiled: result.compiled,
        warnings: result.warnings,
        compiledAt: new Date()
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
);

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
