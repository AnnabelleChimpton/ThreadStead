// Tutorial Link Processor
// Auto-links component mentions in tutorial text to component reference page

import React from 'react';
import { getAllUnifiedComponents } from './unifiedComponentData';

// Build a list of all component names for pattern matching
function getComponentNames(): Set<string> {
  const components = getAllUnifiedComponents();
  const names = new Set<string>();

  components.forEach(({ component }) => {
    names.add(component.name);
    names.add(component.id);
  });

  return names;
}

const COMPONENT_NAMES = getComponentNames();

/**
 * Check if a word is a known component name
 */
function isComponentName(word: string): boolean {
  return COMPONENT_NAMES.has(word) || COMPONENT_NAMES.has(word.toLowerCase());
}

/**
 * Get component ID from component name
 */
function getComponentId(name: string): string {
  // Try exact match first
  const components = getAllUnifiedComponents();
  const match = components.find(
    ({ component }) =>
      component.name === name ||
      component.id === name.toLowerCase() ||
      component.name.toLowerCase() === name.toLowerCase()
  );

  return match ? match.component.id : name.toLowerCase();
}

/**
 * Process text and auto-link component mentions
 * Preserves markdown formatting
 *
 * Examples:
 * - "Use the Slider component" → "Use the [Slider](/templates/components#slider) component"
 * - "The <Var> tag" → "The [<Var>](/templates/components#var) tag"
 * - "**Button** widget" → "**[Button](/templates/components#button)** widget"
 */
export function autoLinkComponents(text: string): string {
  if (!text) return text;

  // Pattern: Find component names (with optional markdown formatting)
  // Match: ComponentName, <ComponentName>, **ComponentName**, `ComponentName`
  // Don't match inside existing markdown links or code blocks

  // First, protect existing links and code blocks from processing
  const protectedRanges: Array<{ start: number; end: number }> = [];

  // Find existing markdown links [text](url)
  const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
  let linkMatch;
  while ((linkMatch = linkPattern.exec(text)) !== null) {
    protectedRanges.push({
      start: linkMatch.index,
      end: linkMatch.index + linkMatch[0].length,
    });
  }

  // Find code blocks ```...```
  const codeBlockPattern = /```[\s\S]*?```/g;
  let codeBlockMatch;
  while ((codeBlockMatch = codeBlockPattern.exec(text)) !== null) {
    protectedRanges.push({
      start: codeBlockMatch.index,
      end: codeBlockMatch.index + codeBlockMatch[0].length,
    });
  }

  // Build component name patterns
  // Match: ComponentName, <ComponentName>, **ComponentName**, `ComponentName`
  const componentNames = Array.from(COMPONENT_NAMES);

  // Sort by length (longest first) to match "ShowVar" before "Show"
  componentNames.sort((a, b) => b.length - a.length);

  let result = text;

  componentNames.forEach((componentName) => {
    // Pattern to match component mentions with optional formatting
    // Capture groups: (prefix)(component name)(suffix)
    const patterns = [
      // <ComponentName>
      new RegExp(`(<)(${componentName})(>)`, 'gi'),
      // **ComponentName**
      new RegExp(`(\\*\\*)(${componentName})(\\*\\*)`, 'gi'),
      // `ComponentName`
      new RegExp(`(\`)(${componentName})(\`)`, 'gi'),
      // Plain ComponentName (as whole word)
      new RegExp(`\\b()(${componentName})(\\b)`, 'gi'),
    ];

    patterns.forEach((pattern) => {
      result = result.replace(pattern, (match, prefix, name, suffix, offset) => {
        // Check if this position is in a protected range
        const isProtected = protectedRanges.some(
          (range) => offset >= range.start && offset < range.end
        );

        if (isProtected) {
          return match; // Don't modify protected content
        }

        const componentId = getComponentId(name);
        const url = `/templates/components#${componentId}`;

        // Return with link wrapped around the component name
        return `${prefix}[${name}](${url})${suffix}`;
      });
    });
  });

  return result;
}

/**
 * Process an array of text strings (like tips array)
 */
export function autoLinkComponentsInArray(textArray: string[]): string[] {
  return textArray.map(autoLinkComponents);
}

/**
 * Generate markdown link for a specific component
 */
export function componentLink(componentId: string, displayText?: string): string {
  const text = displayText || componentId;
  return `[${text}](/templates/components#${componentId})`;
}
