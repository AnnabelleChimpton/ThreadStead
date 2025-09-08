// Template compiler types
import type { ResidentData } from '@/components/features/templates/ResidentDataProvider';

// Profile mode types (matching Prisma schema)
export type ProfileMode = 'default' | 'enhanced' | 'advanced';

// Template compilation context
export interface ProfileRenderContext {
  user: {
    id: string;
    handle: string;
    profile?: {
      templateMode?: ProfileMode;
      customCSS?: string | null;
      customTemplate?: string | null;
      customTemplateAst?: string | null;
      includeSiteCSS?: boolean;
      hideNavigation?: boolean;
    } | null;
  };
  residentData: ResidentData;
}

// Island definition for interactive components
export interface Island {
  id: string;
  component: string;
  props: Record<string, any>;
  children?: Island[];
  placeholder: string;
}

// Compiled template result
export interface CompiledTemplate {
  mode: ProfileMode;
  staticHTML: string;
  islands: Island[];
  fallback?: CompiledTemplate;
  compiledAt: Date;
  errors: string[];
  warnings: string[];
}

// Compilation options
export interface CompilationOptions {
  mode: ProfileMode;
  enableOptimization?: boolean;
  enableSEOMetadata?: boolean;
  maxIslands?: number;
}

// Template compilation result
export interface CompilationResult {
  success: boolean;
  compiled?: CompiledTemplate;
  errors: string[];
  warnings: string[];
}