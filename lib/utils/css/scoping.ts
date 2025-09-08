/**
 * Scopes CSS to a specific container ID to prevent global style pollution
 * @param css - The CSS string to scope
 * @param containerId - The unique container ID to scope to
 * @returns Scoped CSS string
 */
export function scopeCSS(css: string, containerId: string): string {
  if (!css || !css.trim()) return '';
  
  // Improved CSS scoping that properly handles @ rules and complex selectors
  const lines = css.split('\n');
  let result = '';
  let inAtRule = false;
  let braceCount = 0;
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Skip empty lines and comments
    if (!trimmedLine || trimmedLine.startsWith('/*')) {
      result += line + '\n';
      continue;
    }
    
    // Handle @ rules (media queries, keyframes, imports, etc.)
    if (trimmedLine.startsWith('@')) {
      result += line + '\n';
      if (trimmedLine.includes('{')) {
        inAtRule = true;
        braceCount = 1;
      }
      continue;
    }
    
    // Track braces in @ rules
    if (inAtRule) {
      braceCount += (line.match(/{/g) || []).length;
      braceCount -= (line.match(/}/g) || []).length;
      
      if (braceCount <= 0) {
        inAtRule = false;
      }
      
      // If we're inside an @ rule but this looks like a selector, scope it
      if (inAtRule && trimmedLine.includes('{') && !trimmedLine.startsWith('@')) {
        const [selector, rest] = line.split('{');
        const scopedSelector = selector
          .split(',')
          .map(s => `#${containerId} ${s.trim()}`)
          .join(', ');
        result += `${scopedSelector} {${rest}\n`;
      } else {
        result += line + '\n';
      }
      continue;
    }
    
    // Handle regular CSS rules
    if (trimmedLine.includes('{')) {
      const [selector, rest] = line.split('{');
      const scopedSelector = selector
        .split(',')
        .map(s => {
          const cleanSelector = s.trim();
          // Don't scope :root, html, body, or already scoped selectors
          if (cleanSelector === ':root' || 
              cleanSelector === 'html' || 
              cleanSelector === 'body' || 
              cleanSelector.startsWith(`#${containerId}`)) {
            return cleanSelector;
          }
          return `#${containerId} ${cleanSelector}`;
        })
        .join(', ');
      result += `${scopedSelector} {${rest}\n`;
    } else {
      result += line + '\n';
    }
  }
  
  return result;
}

/**
 * Generates a unique container ID for CSS scoping
 * @param baseId - Optional base ID from React.useId()
 * @returns Clean container ID suitable for CSS selectors
 */
export function generateScopeId(baseId?: string): string {
  const id = baseId || Math.random().toString(36).substr(2, 9);
  return id.replace(/:/g, '_');
}