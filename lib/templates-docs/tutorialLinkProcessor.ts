// Tutorial Link Processor
// Auto-links component mentions in tutorial text to component reference page

import React from 'react';
import { COMPONENT_NAMES as REGISTERED_NAMES } from './component-names';

const COMPONENT_NAMES = new Set(REGISTERED_NAMES);

/** Exact name, by case-insensitive match: `<foreach>` links to ForEach. */
function canonicalName(name: string): string | undefined {
  if (COMPONENT_NAMES.has(name)) return name;
  const lower = name.toLowerCase();
  return REGISTERED_NAMES.find((n) => n.toLowerCase() === lower);
}

/** Anchor on the component reference: the lowercase name. */
function getComponentId(name: string): string {
  return (canonicalName(name) ?? name).toLowerCase();
}

/**
 * Names that are also everyday words (Set, Tab, If, Default, Bio…) only
 * link when written as a tag, in bold or as code; as plain words they're
 * usually just words. Names with two capitals (ShowVar, FollowButton) link
 * anywhere, as written.
 */
function isCompoundName(name: string): boolean {
  return /^[A-Z][a-z0-9]*[A-Z]/.test(name);
}

/** A tag written out in the text: `<Guestbook />`, `<Var name="x">`, `</If>`, `<h2>` */
const TAG_IN_TEXT = /<\/?([A-Za-z][\w-]*)(?:\s[^<>]*)?\/?>/g;

/**
 * Tags written in the text become code, so they show as written. The text
 * goes through the HTML sanitizer, which took a bare `<Guestbook />` for real
 * HTML and dropped it ("…drop into your page. is the one I'd start with").
 * A component's tag also links to its reference entry. Code spans and code
 * blocks are left alone.
 */
function tagsAsCode(text: string): string {
  return text
    .split(/(```[\s\S]*?```|`[^`\n]*`)/)
    .map((part, i) => {
      if (i % 2 === 1) return part; // code, as written
      return part.replace(TAG_IN_TEXT, (tag, name: string) => {
        const component = /^[A-Z]/.test(name) ? canonicalName(name) : undefined;
        return component
          ? `[\`${tag}\`](/build/templates/components#${getComponentId(component)})`
          : `\`${tag}\``;
      });
    })
    .join('');
}

/**
 * Process text and auto-link component mentions
 * Preserves markdown formatting
 *
 * Examples:
 * - "Use the ShowVar component" → "Use the [ShowVar](/build/templates/components#showvar) component"
 * - "The <Var> tag" → "The [`<Var>`](/build/templates/components#var) tag"
 * - "**Button** widget" → "**[Button](/build/templates/components#button)** widget"
 */
export function autoLinkComponents(input: string): string {
  if (!input) return input;
  const text = tagsAsCode(input);

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
      // Plain ComponentName (as whole word, as written)
      ...(isCompoundName(componentName) ? [new RegExp(`\\b()(${componentName})(\\b)`, 'g')] : []),
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
        const url = `/build/templates/components#${componentId}`;

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
  return `[${text}](/build/templates/components#${componentId})`;
}
