/**
 * Query Optimizer
 * Preprocesses and enhances search queries for better results
 */

interface QueryOptimizationOptions {
  enableSpellCorrection?: boolean;
  enableSynonyms?: boolean;
  enableStopWordRemoval?: boolean;
  targetEngine?: 'brave' | 'searchmysite' | 'general';
}

/**
 * Common stop words that can be removed for better search results
 * (unless they're part of a quoted phrase)
 */
const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for',
  'from', 'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on',
  'that', 'the', 'to', 'was', 'will', 'with'
]);

/**
 * Common search synonyms and expansions
 */
const SYNONYM_MAP: Record<string, string[]> = {
  'javascript': ['js', 'javascript', 'node', 'nodejs'],
  'js': ['javascript', 'js'],
  'typescript': ['ts', 'typescript'],
  'ts': ['typescript', 'ts'],
  'golang': ['go', 'golang'],
  'go': ['golang', 'go'],
  'indie web': ['indieweb', 'indie web', 'small web', 'independent web'],
  'indieweb': ['indie web', 'indieweb', 'small web'],
  'small web': ['indie web', 'indieweb', 'small web'],
  'blog': ['blog', 'weblog', 'article', 'post'],
  'tutorial': ['tutorial', 'guide', 'how-to', 'howto'],
  'privacy': ['privacy', 'private', 'secure', 'security'],
  'open source': ['opensource', 'open source', 'oss', 'foss'],
  'opensource': ['open source', 'opensource', 'oss'],
  'beginner': ['beginner', 'newbie', 'intro', 'introduction', 'getting started'],
  'newbie': ['beginner', 'newbie', 'intro'],
  'dev': ['developer', 'development', 'dev'],
  'developer': ['dev', 'developer', 'programmer'],
  'programming': ['programming', 'coding', 'development'],
  'coding': ['programming', 'coding', 'code']
};

/**
 * Common typos and corrections
 */
const TYPO_CORRECTIONS: Record<string, string> = {
  'javscript': 'javascript',
  'javascrip': 'javascript',
  'typscript': 'typescript',
  'typescirpt': 'typescript',
  'pyton': 'python',
  'pythn': 'python',
  'reat': 'react',
  'raect': 'react',
  'recat': 'react',
  'indieewb': 'indieweb',
  'indeiweb': 'indieweb',
  'privcay': 'privacy',
  'privcy': 'privacy',
  'tutroial': 'tutorial',
  'tutoral': 'tutorial',
  'begginer': 'beginner',
  'begginner': 'beginner'
};

/**
 * Extract quoted phrases from query
 */
function extractQuotedPhrases(query: string): { phrases: string[]; remainder: string } {
  const phrases: string[] = [];
  let remainder = query;

  // Match both single and double quotes
  const regex = /["']([^"']+)["']/g;
  let match;

  while ((match = regex.exec(query)) !== null) {
    phrases.push(match[1]);
    remainder = remainder.replace(match[0], '');
  }

  return {
    phrases,
    remainder: remainder.trim()
  };
}

/**
 * Apply spell correction to individual words
 */
function applySpellCorrection(word: string): string {
  const lower = word.toLowerCase();
  return TYPO_CORRECTIONS[lower] || word;
}

/**
 * Expand query with synonyms (for broader search)
 */
function expandWithSynonyms(query: string): string {
  const words = query.split(/\s+/);
  const expandedTerms = new Set<string>();

  for (const word of words) {
    const lower = word.toLowerCase();
    expandedTerms.add(word);

    // Check if this word has synonyms
    if (SYNONYM_MAP[lower]) {
      // For indie web searches, be more aggressive with synonyms
      const synonyms = SYNONYM_MAP[lower].slice(0, 2); // Limit to 2 synonyms
      synonyms.forEach(syn => expandedTerms.add(syn));
    }
  }

  // Check for multi-word phrases
  for (let i = 0; i < words.length - 1; i++) {
    const phrase = `${words[i]} ${words[i + 1]}`.toLowerCase();
    if (SYNONYM_MAP[phrase]) {
      // Add OR clause for phrase synonyms
      const synonyms = SYNONYM_MAP[phrase].slice(0, 1); // Just add primary synonym
      synonyms.forEach(syn => expandedTerms.add(`"${syn}"`));
    }
  }

  return Array.from(expandedTerms).join(' ');
}

/**
 * Remove stop words (but keep them in quoted phrases)
 */
function removeStopWords(query: string): string {
  const words = query.split(/\s+/);
  return words
    .filter(word => {
      const lower = word.toLowerCase();
      // Keep if it's not a stop word, or if it's capitalized (might be important)
      return !STOP_WORDS.has(lower) || word[0] === word[0].toUpperCase();
    })
    .join(' ');
}

/**
 * Format query for specific search engines
 */
function formatForEngine(query: string, engine?: string): string {
  switch (engine) {
    case 'brave':
      // Brave handles complex queries well, but benefits from proper quoting
      return query;

    case 'searchmysite':
      // SearchMySite prefers simpler queries
      // Remove advanced operators that might not be supported
      return query.replace(/site:|filetype:|intitle:|inurl:/gi, '');

    default:
      return query;
  }
}

/**
 * Main query optimization function
 */
export function optimizeQuery(
  rawQuery: string,
  options: QueryOptimizationOptions = {}
): string {
  const {
    enableSpellCorrection = true,
    enableSynonyms = false, // Disabled by default to avoid too broad results
    enableStopWordRemoval = false, // Disabled by default to preserve user intent
    targetEngine = 'general'
  } = options;

  // Handle empty or whitespace-only queries
  if (!rawQuery || !rawQuery.trim()) {
    return '';
  }

  const query = rawQuery.trim();

  // Extract quoted phrases to preserve them
  const { phrases, remainder } = extractQuotedPhrases(query);

  // Process the non-quoted part
  let processed = remainder;

  // Apply spell correction
  if (enableSpellCorrection && processed) {
    const words = processed.split(/\s+/);
    processed = words.map(word => applySpellCorrection(word)).join(' ');
  }

  // Remove stop words (if enabled)
  if (enableStopWordRemoval && processed) {
    processed = removeStopWords(processed);
  }

  // Expand with synonyms (if enabled)
  if (enableSynonyms && processed) {
    processed = expandWithSynonyms(processed);
  }

  // Reconstruct query with quoted phrases
  const quotedPhrases = phrases.map(p => `"${p}"`).join(' ');
  let finalQuery = processed;
  if (quotedPhrases) {
    finalQuery = quotedPhrases + (finalQuery ? ' ' + finalQuery : '');
  }

  // Format for specific engine
  finalQuery = formatForEngine(finalQuery, targetEngine);

  // Clean up extra spaces
  finalQuery = finalQuery.replace(/\s+/g, ' ').trim();

  // Ensure query isn't too long (most engines have limits)
  if (finalQuery.length > 200) {
    // Truncate intelligently at word boundary
    finalQuery = finalQuery.substring(0, 200).replace(/\s+\S*$/, '');
  }

  return finalQuery;
}

/**
 * Suggest query improvements
 */
export function suggestQueryImprovements(query: string): string[] {
  const suggestions: string[] = [];

  // Check if query is too short
  if (query.length < 3) {
    suggestions.push('Try using more descriptive keywords');
  }

  // Check if query is all lowercase - might benefit from proper nouns
  if (query === query.toLowerCase() && query.length > 10) {
    suggestions.push('Consider capitalizing proper nouns for better results');
  }

  // Check for common search patterns that could be improved
  if (query.includes(' how to ')) {
    suggestions.push('Try searching for "tutorial" or "guide" instead of "how to"');
  }

  // Suggest using quotes for exact phrases
  if (query.split(' ').length > 4 && !query.includes('"')) {
    suggestions.push('Use quotes around exact phrases like "indie web blog"');
  }

  // Check for potential typos
  const words = query.split(/\s+/);
  const corrections = words.filter(word => TYPO_CORRECTIONS[word.toLowerCase()]);
  if (corrections.length > 0) {
    suggestions.push(`Did you mean: ${words.map(w => applySpellCorrection(w)).join(' ')}?`);
  }

  return suggestions;
}

/**
 * Check if query needs optimization
 */
export function needsOptimization(query: string): boolean {
  // Check for common typos
  const words = query.toLowerCase().split(/\s+/);
  for (const word of words) {
    if (TYPO_CORRECTIONS[word]) {
      return true;
    }
  }

  // Check if it's too generic (single common word)
  if (words.length === 1 && STOP_WORDS.has(words[0])) {
    return true;
  }

  return false;
}