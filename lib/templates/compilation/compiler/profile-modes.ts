// Profile mode compilation logic
import type { 
  ProfileRenderContext, 
  CompiledTemplate, 
  CompilationResult,
  ProfileMode,
  CompilationOptions 
} from './types';
import { compileTemplate } from '@/lib/templates/compilation/template-parser';
import { identifyIslandsWithTransform } from './island-detector';
import { generateStaticHTML } from './html-optimizer';

// Main profile template compilation function
export async function compileProfileTemplate(
  context: ProfileRenderContext,
  options: CompilationOptions = { mode: 'default' }
): Promise<CompilationResult> {
  const mode = context.user.profile?.templateMode || options.mode || 'default';
  
  try {
    switch (mode) {
      case 'default':
        return await compileDefaultMode(context, options);
      case 'enhanced':
        return await compileEnhancedMode(context, options);
      case 'advanced':
        return await compileAdvancedMode(context, options);
      default:
        // Fallback to default mode
        return await compileDefaultMode(context, { ...options, mode: 'default' });
    }
  } catch (error) {
    return {
      success: false,
      errors: [`Compilation failed: ${error}`],
      warnings: []
    };
  }
}

// Compile default profile mode (standard React components)
async function compileDefaultMode(
  context: ProfileRenderContext,
  options: CompilationOptions
): Promise<CompilationResult> {
  // For default mode, we don't need islands - it's handled by React SSR
  const staticHTML = generateDefaultProfileHTML(context);
  
  const compiled: CompiledTemplate = {
    mode: 'default',
    staticHTML,
    islands: [], // No islands needed for default mode
    compiledAt: new Date(),
    errors: [],
    warnings: []
  };
  
  return {
    success: true,
    compiled,
    errors: [],
    warnings: []
  };
}

// Compile enhanced mode (default + CSS override)
async function compileEnhancedMode(
  context: ProfileRenderContext,
  options: CompilationOptions
): Promise<CompilationResult> {
  // Enhanced mode is default + custom CSS
  const defaultCompilation = await compileDefaultMode(context, options);
  
  if (!defaultCompilation.success || !defaultCompilation.compiled) {
    return defaultCompilation;
  }
  
  const customCSS = context.user.profile?.customCSS;
  let staticHTML = defaultCompilation.compiled.staticHTML;
  
  // Inject custom CSS if provided
  if (customCSS) {
    const styleTag = `<style type="text/css">${customCSS}</style>`;
    staticHTML = injectCSS(staticHTML, styleTag);
  }
  
  const compiled: CompiledTemplate = {
    ...defaultCompilation.compiled,
    mode: 'enhanced',
    staticHTML,
    fallback: defaultCompilation.compiled // Fallback to default mode
  };
  
  return {
    success: true,
    compiled,
    errors: [],
    warnings: []
  };
}

// Compile advanced mode (custom template with islands)
async function compileAdvancedMode(
  context: ProfileRenderContext,
  options: CompilationOptions
): Promise<CompilationResult> {
  const customTemplate = context.user.profile?.customTemplate;
  
  if (!customTemplate) {
    // No custom template, fall back to enhanced mode
    const fallback = await compileEnhancedMode(context, { ...options, mode: 'enhanced' });
    return {
      success: false,
      errors: ['No custom template found for advanced mode'],
      warnings: ['Falling back to enhanced mode']
    };
  }
  
  try {
    // Debug: Check positioning data in raw template HTML (both old and new formats)
    const hasPositioningInTemplate = customTemplate.includes('data-positioning-mode') ||
                                     customTemplate.includes('data-pixel-position') ||
                                     customTemplate.includes('data-pure-positioning');


    // Parse the custom template
    const parseResult = compileTemplate(customTemplate);

    if (!parseResult.success || !parseResult.ast) {
      // Compilation failed, create fallback
      const fallback = await compileEnhancedMode(context, { ...options, mode: 'enhanced' });
      return {
        success: false,
        errors: parseResult.errors,
        warnings: ['Template compilation failed, falling back to enhanced mode']
      };
    }
    
    // Identify interactive components (islands)
    const { islands, transformedAst } = identifyIslandsWithTransform(parseResult.ast);

    // Generate static HTML with island placeholders
    const staticHTML = generateStaticHTML(transformedAst, islands);
    
    // Create fallback compilation
    const fallback = await compileEnhancedMode(context, { ...options, mode: 'enhanced' });
    
    const compiled: CompiledTemplate = {
      mode: 'advanced',
      staticHTML,
      islands,
      fallback: fallback.success ? fallback.compiled : undefined,
      compiledAt: new Date(),
      errors: parseResult.errors,
      warnings: parseResult.validation?.warnings || []
    };
    
    return {
      success: true,
      compiled,
      errors: [],
      warnings: compiled.warnings
    };
    
  } catch (error) {
    // Error in advanced compilation, fall back to enhanced mode
    const fallback = await compileEnhancedMode(context, { ...options, mode: 'enhanced' });
    
    return {
      success: false,
      errors: [`Advanced template compilation failed: ${error}`],
      warnings: ['Falling back to enhanced mode']
    };
  }
}

// Generate default profile HTML structure
function generateDefaultProfileHTML(context: ProfileRenderContext): string {
  const { user, residentData } = context;
  
  // This is a simplified version - in reality this would be generated by React SSR
  return `
<div class="profile-container">
  <div class="profile-header">
    <div class="profile-photo">
      <!-- Profile photo component -->
    </div>
    <div class="profile-info">
      <h1 class="display-name">${residentData.owner.displayName}</h1>
      ${residentData.capabilities?.bio ? `<p class="bio">${residentData.capabilities.bio}</p>` : ''}
    </div>
  </div>
  
  <div class="profile-content">
    <!-- Profile content tabs and components -->
  </div>
</div>
  `.trim();
}

// Inject CSS into HTML document
function injectCSS(html: string, cssContent: string): string {
  // Try to inject before closing head tag, or at the beginning if no head
  if (html.includes('</head>')) {
    return html.replace('</head>', `${cssContent}\n</head>`);
  } else {
    return `${cssContent}\n${html}`;
  }
}

// Validate template mode compatibility
export function validateModeCompatibility(
  template: string, 
  mode: ProfileMode
): { isValid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (mode === 'advanced' && !template) {
    errors.push('Advanced mode requires a custom template');
  }
  
  if (mode === 'default' && template) {
    warnings.push('Custom template provided for default mode will be ignored');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}