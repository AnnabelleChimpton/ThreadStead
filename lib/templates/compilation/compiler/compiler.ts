// Main template compiler interface
import type {
  ProfileRenderContext,
  CompilationResult,
  CompilationOptions,
  ProfileMode
} from './types';
import { compileProfileTemplate, validateModeCompatibility } from './profile-modes';
import { calculateMetrics } from './html-optimizer';
import { clearExpressionCaches } from '../../state/expression-evaluator';

// Main compiler class
export class TemplateCompiler {
  private defaultOptions: CompilationOptions = {
    mode: 'default',
    enableOptimization: true,
    enableSEOMetadata: true,
    maxIslands: 50
  };

  constructor(private options: Partial<CompilationOptions> = {}) {
    this.defaultOptions = { ...this.defaultOptions, ...options };
  }

  // Compile a profile template with the given context
  async compile(
    context: ProfileRenderContext,
    options?: Partial<CompilationOptions>
  ): Promise<CompilationResult> {
    const compilationOptions = { ...this.defaultOptions, ...options };

    // P1.2: Clear expression caches on new compilation
    clearExpressionCaches();

    // Validate the mode compatibility first
    const template = context.user.profile?.customTemplate || '';
    const mode = context.user.profile?.templateMode || compilationOptions.mode;
    
    const validation = validateModeCompatibility(template, mode);
    
    if (!validation.isValid) {
      return {
        success: false,
        errors: validation.errors,
        warnings: validation.warnings
      };
    }
    
    // Perform the compilation
    const result = await compileProfileTemplate(context, compilationOptions);
    
    // Add performance metrics if compilation was successful
    if (result.success && result.compiled) {
      // Note: We'll add metrics to the compiled template in a future iteration
      // For now, just log them
      if (result.compiled.staticHTML && result.compiled.islands) {
        const metrics = calculateMetrics(
          result.compiled.staticHTML,
          result.compiled.islands,
          { type: 'root', children: [] } // Simplified for now
        );      
      }
    }
    
    return {
      ...result,
      warnings: [...(result.warnings || []), ...validation.warnings]
    };
  }

  // Compile multiple profiles in batch
  async compileBatch(
    contexts: ProfileRenderContext[],
    options?: Partial<CompilationOptions>
  ): Promise<CompilationResult[]> {
    const results = await Promise.allSettled(
      contexts.map(context => this.compile(context, options))
    );
    
    return results.map(result => 
      result.status === 'fulfilled' 
        ? result.value 
        : {
            success: false,
            errors: [`Batch compilation failed: ${result.reason}`],
            warnings: []
          }
    );
  }

  // Quick validation without full compilation
  validateTemplate(template: string, mode: ProfileMode): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    return validateModeCompatibility(template, mode);
  }
}

// Create a default compiler instance
export const defaultCompiler = new TemplateCompiler();

// Convenience functions for common operations
export async function compileProfile(
  context: ProfileRenderContext,
  options?: Partial<CompilationOptions>
): Promise<CompilationResult> {
  return defaultCompiler.compile(context, options);
}

export function validateProfileTemplate(
  template: string, 
  mode: ProfileMode
): { isValid: boolean; errors: string[]; warnings: string[] } {
  return defaultCompiler.validateTemplate(template, mode);
}