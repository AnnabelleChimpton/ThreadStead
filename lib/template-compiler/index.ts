// Template compiler main exports
export * from './types';
export * from './compiler';
export * from './profile-modes';
export * from './island-detector';
export * from './html-optimizer';

// Re-export the main compiler functions for convenience
export { 
  TemplateCompiler, 
  defaultCompiler, 
  compileProfile, 
  validateProfileTemplate 
} from './compiler';

export { 
  compileProfileTemplate,
  validateModeCompatibility 
} from './profile-modes';

export { 
  identifyIslands, 
  generateIslandId 
} from './island-detector';

export { 
  generateStaticHTML, 
  optimizeCSS, 
  escapeHtml,
  calculateMetrics 
} from './html-optimizer';

// Client-side utilities
export { 
  useTemplateCompiler, 
  shouldRecompile 
} from './client';