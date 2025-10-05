/**
 * Centralized Template Error Handler
 * Parses compilation errors and provides user-friendly, actionable error messages
 */

export interface TemplateError {
  type: 'syntax' | 'component' | 'attribute' | 'compilation' | 'validation' | 'unknown';
  title: string;
  message: string;
  line?: number;
  column?: number;
  component?: string;
  suggestion?: string;
  details?: string;
  rawError?: string;
}

/**
 * Parse error message to extract meaningful information
 */
function parseErrorMessage(error: string): {
  line?: number;
  column?: number;
  component?: string;
  message: string;
} {
  const result: ReturnType<typeof parseErrorMessage> = {
    message: error
  };

  // Extract line number: "line 45:", "at line 45", etc.
  const lineMatch = error.match(/(?:line|Line)\s*(\d+)/i);
  if (lineMatch) {
    result.line = parseInt(lineMatch[1], 10);
  }

  // Extract column number: "column 12", "col 12", etc.
  const colMatch = error.match(/(?:column|col)\s*(\d+)/i);
  if (colMatch) {
    result.column = parseInt(colMatch[1], 10);
  }

  // Extract component name from various patterns
  const componentPatterns = [
    /component\s+["']?([A-Z][a-zA-Z0-9]+)["']?/i,
    /tag\s+["']?([A-Z][a-zA-Z0-9]+)["']?/i,
    /<([A-Z][a-zA-Z0-9]+)>/,
    /Unknown\s+(?:component|tag):\s*["']?([A-Z][a-zA-Z0-9]+)["']?/i,
  ];

  for (const pattern of componentPatterns) {
    const match = error.match(pattern);
    if (match) {
      result.component = match[1];
      break;
    }
  }

  return result;
}

/**
 * Suggest fixes based on error type and context
 */
function generateSuggestion(
  type: TemplateError['type'],
  component?: string,
  message?: string
): string | undefined {
  switch (type) {
    case 'component':
      if (component) {
        // Common typos
        const suggestions: Record<string, string> = {
          'BlogPost': 'BlogPosts',
          'Post': 'BlogPosts',
          'Friend': 'FriendDisplay',
          'Friends': 'FriendDisplay or FeaturedFriends',
          'Profile': 'ProfilePhoto or ProfileHero',
          'Image': 'ProfilePhoto or UserImage',
          'Text': 'TextElement or Paragraph',
        };

        if (suggestions[component]) {
          return `Did you mean "${suggestions[component]}"?`;
        }

        return 'Check the component name spelling. Components must start with a capital letter.';
      }
      return 'Make sure the component is registered and spelled correctly.';

    case 'syntax':
      if (message?.includes('closing tag')) {
        return 'Every opening tag needs a matching closing tag. Example: <Show>...</Show>';
      }
      if (message?.includes('attribute')) {
        return 'Check the attribute syntax. Use double quotes for values: attribute="value"';
      }
      return 'Check your HTML syntax. Make sure tags are properly opened and closed.';

    case 'attribute':
      return 'Check the attribute name and value. Common attributes: data, when, equals, contains, etc.';

    case 'validation':
      if (message?.toLowerCase().includes('too many nodes')) {
        return 'Try simplifying your template or removing unnecessary wrapper elements. Large CSS blocks in <style> tags count as nodes.';
      }
      if (message?.toLowerCase().includes('too large')) {
        return 'Your template exceeds the size limit. Consider moving inline styles to the Custom CSS field.';
      }
      if (message?.toLowerCase().includes('too many components')) {
        return 'Reduce the number of components or simplify your template structure.';
      }
      if (message?.toLowerCase().includes('too deeply nested')) {
        return 'Reduce nesting depth by flattening your template structure or breaking it into smaller sections.';
      }
      return 'Your template exceeds complexity limits. Try simplifying the structure.';

    case 'compilation':
      return 'Try simplifying your template to find the problematic section.';

    default:
      return undefined;
  }
}

/**
 * Categorize error based on message content
 */
function categorizeError(errorMessage: string): TemplateError['type'] {
  const lower = errorMessage.toLowerCase();

  if (lower.includes('unknown component') || lower.includes('invalid component') ||
      lower.includes('component not found') || lower.includes('not registered')) {
    return 'component';
  }

  if (lower.includes('closing tag') || lower.includes('opening tag') ||
      lower.includes('unexpected') || lower.includes('syntax error')) {
    return 'syntax';
  }

  if (lower.includes('attribute') || lower.includes('prop') || lower.includes('property')) {
    return 'attribute';
  }

  if (lower.includes('validation') || lower.includes('invalid value') ||
      lower.includes('too many nodes') || lower.includes('too large') ||
      lower.includes('too deeply nested') || lower.includes('too many components') ||
      lower.includes('exceeds') || lower.includes('maximum')) {
    return 'validation';
  }

  if (lower.includes('compilation') || lower.includes('parse') || lower.includes('transform')) {
    return 'compilation';
  }

  return 'unknown';
}

/**
 * Generate user-friendly title based on error type
 */
function generateTitle(type: TemplateError['type'], component?: string, message?: string): string {
  switch (type) {
    case 'component':
      return component ? `Unknown Component: "${component}"` : 'Component Error';
    case 'syntax':
      return 'Syntax Error';
    case 'attribute':
      return 'Attribute Error';
    case 'validation':
      // Provide specific titles for different validation errors
      if (message?.toLowerCase().includes('too many nodes') || message?.toLowerCase().includes('too large')) {
        return 'Template Too Complex';
      }
      if (message?.toLowerCase().includes('too many components')) {
        return 'Too Many Components';
      }
      if (message?.toLowerCase().includes('too deeply nested')) {
        return 'Template Too Deeply Nested';
      }
      return 'Validation Error';
    case 'compilation':
      return 'Template Compilation Error';
    default:
      return 'Template Error';
  }
}

/**
 * Generate user-friendly error message
 */
function generateMessage(
  type: TemplateError['type'],
  parsed: ReturnType<typeof parseErrorMessage>
): string {
  let message = parsed.message;

  // Add line/column information if available
  if (parsed.line) {
    const location = parsed.column
      ? `Line ${parsed.line}, Column ${parsed.column}`
      : `Line ${parsed.line}`;
    message = `${location}: ${message}`;
  }

  return message;
}

/**
 * Main function to parse and enhance template errors
 */
export function parseTemplateError(error: Error | string): TemplateError {
  const errorMessage = typeof error === 'string' ? error : error.message;
  const stack = typeof error === 'object' && error.stack ? error.stack : undefined;

  // Parse the error
  const parsed = parseErrorMessage(errorMessage);
  const type = categorizeError(errorMessage);

  // Generate helpful content
  const title = generateTitle(type, parsed.component, errorMessage);
  const message = generateMessage(type, parsed);
  const suggestion = generateSuggestion(type, parsed.component, errorMessage);

  // Determine details based on type
  let details: string | undefined;
  if (type === 'component' && parsed.component) {
    details = 'Available components: Show, Choose, When, Otherwise, IfOwner, IfVisitor, BlogPosts, DisplayName, Bio, ProfilePhoto, and more.';
  } else if (type === 'syntax') {
    details = 'HTML syntax must be valid. Check that all tags are properly closed and nested.';
  } else if (type === 'validation') {
    // Extract numbers from validation errors for helpful details
    const nodeMatch = errorMessage.match(/(\d+)\s*\(max:\s*(\d+)\)/);
    if (nodeMatch) {
      const [_, current, max] = nodeMatch;
      details = `Your template has ${current} nodes. The maximum is ${max}. Consider moving inline CSS to the Custom CSS field to reduce node count.`;
    } else if (errorMessage.toLowerCase().includes('too large')) {
      const sizeMatch = errorMessage.match(/([\d.]+)KB\s*\(max:\s*([\d.]+)KB\)/);
      if (sizeMatch) {
        const [_, current, max] = sizeMatch;
        details = `Your template is ${current}KB. The maximum size is ${max}KB.`;
      }
    } else {
      details = 'Templates have size and complexity limits to ensure good performance.';
    }
  }

  return {
    type,
    title,
    message,
    line: parsed.line,
    column: parsed.column,
    component: parsed.component,
    suggestion,
    details,
    rawError: errorMessage,
  };
}

/**
 * Format error for display in UI
 */
export function formatTemplateErrorForDisplay(error: TemplateError): string {
  let formatted = `⚠️ ${error.title}\n\n`;
  formatted += `${error.message}\n`;

  if (error.suggestion) {
    formatted += `\n💡 ${error.suggestion}\n`;
  }

  if (error.details) {
    formatted += `\nℹ️ ${error.details}\n`;
  }

  return formatted;
}

/**
 * Format error for API response
 */
export function formatTemplateErrorForAPI(error: TemplateError): {
  error: string;
  type: string;
  line?: number;
  column?: number;
  suggestion?: string;
  details?: string;
} {
  return {
    error: error.title,
    type: error.type,
    line: error.line,
    column: error.column,
    suggestion: error.suggestion,
    details: error.details || error.message,
  };
}

/**
 * Quick helper to get a user-friendly error message from any error
 */
export function getUserFriendlyError(error: unknown): string {
  if (!error) {
    return 'An unknown error occurred while processing your template.';
  }

  if (typeof error === 'string') {
    const parsed = parseTemplateError(error);
    return formatTemplateErrorForDisplay(parsed);
  }

  if (error instanceof Error) {
    const parsed = parseTemplateError(error);
    return formatTemplateErrorForDisplay(parsed);
  }

  return 'An unexpected error occurred. Please check your template syntax.';
}

/**
 * Check if error is a template-related error
 */
export function isTemplateError(error: unknown): boolean {
  if (!error) return false;

  const message = typeof error === 'string'
    ? error
    : error instanceof Error
    ? error.message
    : '';

  return message.toLowerCase().includes('template') ||
         message.toLowerCase().includes('component') ||
         message.toLowerCase().includes('compilation') ||
         message.toLowerCase().includes('parse');
}
