import { validateContent, ValidationResult } from "./content";

const LENGTH_MIN = 1;
const LENGTH_MAX = 200;

const FLAGGED_TERMS: string[] = [
  // No reserved words for post titles - just check for offensive content
  // But we could add spam-like terms if needed in the future
];

function normalizePostTitle(title: string): string {
  // Clean up excessive whitespace and normalize
  return title
    .replace(/\s+/g, ' ')
    .trim();
}

export function validatePostTitle(raw: string): ValidationResult {
  return validateContent(raw, {
    lengthMin: LENGTH_MIN,
    lengthMax: LENGTH_MAX,
    allowDoublePunctuation: true, // Allow punctuation in titles
    allowTrailingPunctuation: true, // Allow trailing punctuation in titles
    checkObscenity: true,
    reservedWords: FLAGGED_TERMS,
    customNormalizer: normalizePostTitle,
    contextName: "Post title"
  });
}