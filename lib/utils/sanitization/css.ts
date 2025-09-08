// CSS sanitizer with safe @import support.
// Strips dangerous content but allows safe @import from trusted sources.
export function cleanCss(input: string) {
  if (!input) return "";
  
  // Allow safe @import from trusted domains (Google Fonts, etc.)
  const safeImportPattern = /@import\s+url\(['"]?(https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com)\/[^'"]*)['"]?\);?/gi;
  const safeImports: string[] = [];
  let tempInput = input;
  
  // Extract safe imports
  tempInput = tempInput.replace(safeImportPattern, (match) => {
    safeImports.push(match);
    return ''; // Remove from temp input for further checking
  });
  
  // Check for dangerous patterns in the rest of the CSS
  const banned = /(expression\s*\(|@import|url\(\s*(['"]?)\s*javascript:|behavior\s*:)/i;
  if (banned.test(tempInput)) {
    return ""; // Block entire CSS if dangerous patterns found
  }
  
  // Reconstruct CSS with safe imports at the top
  return safeImports.join('\n') + (safeImports.length > 0 ? '\n' : '') + tempInput;
}
