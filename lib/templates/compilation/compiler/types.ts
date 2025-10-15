// Template compiler types
import type { ResidentData } from '@/components/features/templates/ResidentDataProvider';
import type React from 'react';

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
  // Phase 2: Pre-computed props for faster hydration
  // Contains props processed at compile-time to avoid runtime processing
  _precomputed?: {
    styles: React.CSSProperties; // Pre-computed styles from CSS props
    componentProps: Record<string, any>; // Component props (CSS props removed)
  };
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
  strippedComponents?: Array<{
    name: string;
    line?: number;
    reason?: string;
  }>;
  validation?: {
    isValid: boolean;
    stats?: {
      nodeCount: number;
      maxDepth: number;
      componentCounts: Record<string, number>;
    };
  };
}