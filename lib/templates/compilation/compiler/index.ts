// Template compiler main exports
export * from './types';
export * from './island-detector';
export * from './html-optimizer';

// Re-export the main compiler functions for convenience
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
