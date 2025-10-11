// Template limits - based on Phase 1 & 2 performance optimizations
// Updated: 2025-10-11 (after code splitting and prop pre-computation)

export interface TemplateLimits {
  maxSizeBytes: number;
  maxNodes: number;
  maxDepth: number;
  maxComponents: number;
  maxIslands: number;
  maxComputedVariables: number;
  maxExpressionLength: number;
  maxForEachItems: number;
}

export interface WarningThresholds {
  sizeBytes: number;
  nodes: number;
  depth: number;
  components: number;
  islands: number;
  computedVariables: number;
  compilationMs: number;
}

// Hard limits (block compilation with error)
export const TEMPLATE_LIMITS: TemplateLimits = {
  // Increased from 64KB (parsing is fast, compilation cached)
  maxSizeBytes: 100 * 1024,

  // Keep current (reasonable)
  maxNodes: 1500,
  maxDepth: 30,

  // Increased from 250 (Phase 1 code splitting removes bundle bloat)
  maxComponents: 400,

  // Increased from 50 (Phase 1 code splitting + Phase 2 pre-computation + islands already parallel)
  maxIslands: 150,

  // Increased from 50 (DFS cycle detection scales well)
  maxComputedVariables: 75,

  // Keep reasonable (usability)
  maxExpressionLength: 500,
  maxForEachItems: 200, // Browser DOM limit
};

// Soft limits (show warning, don't block)
export const WARNING_THRESHOLDS: WarningThresholds = {
  sizeBytes: 60 * 1024,     // Warn at 60KB (60% of limit)
  nodes: 1000,              // Warn at 1000 nodes (67%)
  depth: 20,                // Warn at 20 levels (67%)
  components: 300,          // Warn at 300 components (75%)
  islands: 100,             // Warn at 100 islands (67%)
  computedVariables: 50,    // Warn at 50 (67%)
  compilationMs: 300,       // Warn if compilation >300ms
};

// Helpful optimization tips for each limit type
export function getOptimizationTips(limitType: string): string[] {
  const tips: Record<string, string[]> = {
    size: [
      'Use ForEach instead of repeating similar components',
      'Move repeated HTML into Var + ShowVar pattern',
      'Split large templates into multiple smaller templates',
      'Remove unused components and variables',
    ],
    islands: [
      'Replace multiple Buttons with a single Button in a ForEach',
      'Use Show/Hide instead of conditional islands where possible',
      'Consider using static HTML for non-interactive sections',
      'Combine related interactive elements into single components',
    ],
    depth: [
      'Flatten nested ForEach loops where possible',
      'Extract deeply nested sections into reusable components',
      'Avoid excessive Show/If nesting',
    ],
    components: [
      'Use ForEach to generate repeated components',
      'Replace multiple similar components with a single templated component',
      'Remove unused components from your template',
    ],
    nodes: [
      'Use ForEach instead of repeating similar HTML',
      'Simplify complex nested structures',
      'Remove unnecessary wrapper elements',
    ],
    computedVariables: [
      'Combine multiple computed variables into single expressions',
      'Move complex calculations to the backend/API',
      'Cache intermediate results in regular variables',
    ],
  };

  return tips[limitType] || [];
}

// Format error message with limit details and optimization tips
export function formatLimitError(
  limitType: string,
  currentValue: number,
  maxValue: number
): string {
  const tips = getOptimizationTips(limitType);
  const limitName = limitType.charAt(0).toUpperCase() + limitType.slice(1);

  let message = `${limitName} limit exceeded: ${currentValue} (max: ${maxValue})`;

  if (tips.length > 0) {
    message += `\n\n💡 Tips to reduce ${limitType}:\n`;
    message += tips.map(tip => `  • ${tip}`).join('\n');
  }

  return message;
}

// Format warning message for approaching limits
export function formatWarning(
  limitType: string,
  currentValue: number,
  warningThreshold: number,
  maxValue: number
): string {
  const limitName = limitType.charAt(0).toUpperCase() + limitType.slice(1);
  const percentage = Math.round((currentValue / maxValue) * 100);

  return `${limitName} approaching limit: ${currentValue} (${percentage}% of max ${maxValue})`;
}

// Check if value exceeds warning threshold
export function isWarningThreshold(
  limitType: keyof WarningThresholds,
  currentValue: number
): boolean {
  return currentValue > WARNING_THRESHOLDS[limitType];
}

// Get all warnings for template stats
export interface TemplateWarnings {
  warnings: string[];
  stats: {
    sizeBytes?: number;
    nodes?: number;
    depth?: number;
    components?: number;
    islands?: number;
    computedVariables?: number;
    compilationMs?: number;
  };
}

export function checkWarningThresholds(stats: {
  sizeBytes?: number;
  nodes?: number;
  depth?: number;
  components?: number;
  islands?: number;
  computedVariables?: number;
  compilationMs?: number;
}): string[] {
  const warnings: string[] = [];

  if (stats.sizeBytes !== undefined && stats.sizeBytes > WARNING_THRESHOLDS.sizeBytes) {
    const sizeKB = (stats.sizeBytes / 1024).toFixed(1);
    const maxKB = (TEMPLATE_LIMITS.maxSizeBytes / 1024).toFixed(0);
    warnings.push(formatWarning('size', parseFloat(sizeKB), WARNING_THRESHOLDS.sizeBytes / 1024, parseFloat(maxKB)));
  }

  if (stats.nodes !== undefined && stats.nodes > WARNING_THRESHOLDS.nodes) {
    warnings.push(formatWarning('nodes', stats.nodes, WARNING_THRESHOLDS.nodes, TEMPLATE_LIMITS.maxNodes));
  }

  if (stats.depth !== undefined && stats.depth > WARNING_THRESHOLDS.depth) {
    warnings.push(formatWarning('depth', stats.depth, WARNING_THRESHOLDS.depth, TEMPLATE_LIMITS.maxDepth));
  }

  if (stats.components !== undefined && stats.components > WARNING_THRESHOLDS.components) {
    warnings.push(formatWarning('components', stats.components, WARNING_THRESHOLDS.components, TEMPLATE_LIMITS.maxComponents));
  }

  if (stats.islands !== undefined && stats.islands > WARNING_THRESHOLDS.islands) {
    warnings.push(formatWarning('islands', stats.islands, WARNING_THRESHOLDS.islands, TEMPLATE_LIMITS.maxIslands));
  }

  if (stats.computedVariables !== undefined && stats.computedVariables > WARNING_THRESHOLDS.computedVariables) {
    warnings.push(formatWarning('computedVariables', stats.computedVariables, WARNING_THRESHOLDS.computedVariables, TEMPLATE_LIMITS.maxComputedVariables));
  }

  if (stats.compilationMs !== undefined && stats.compilationMs > WARNING_THRESHOLDS.compilationMs) {
    warnings.push(`Compilation time: ${stats.compilationMs}ms (consider optimizing template)`);
  }

  return warnings;
}
