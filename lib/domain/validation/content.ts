export type ValidationErrorCode =
  | "too_short"
  | "too_long" 
  | "bad_charset"
  | "double_punct"
  | "trailing_punct"
  | "obscene"
  | "reserved"
  | "empty"
  | "invalid_format";

export type ValidationResult =
  | { ok: true; normalized: string; warnings?: string[] }
  | { ok: false; code: ValidationErrorCode; message: string; matched?: string };

export type ContentValidationConfig = {
  lengthMin: number;
  lengthMax: number;
  formatRegex?: RegExp;
  allowDoublePunctuation?: boolean;
  allowTrailingPunctuation?: boolean;
  checkObscenity?: boolean;
  reservedWords?: string[];
  customNormalizer?: (input: string) => string;
  contextName?: string; // For better error messages
};

const OBSCENE_PATTERNS: RegExp[] = [
  // N-word (with basic substitutions) - catches embedded versions
  /n[1i!l][g9q]{2}[e3a4]r?/i,
  // F-slur (for gay men) - comprehensive patterns
  /f[a4@][g9q]+[oea0t]*/i,
  /f[a4@]g{1,2}[oea0t]*/i,
  // C-word (for women) - catches embedded but avoids common false positives
  /c[uµ]n+t(?!r)/i,  // Avoids "country" but catches "cunt", "cunnt", etc.
  // R-slur (disability slur) - various forms
  /r[e3][t7][a4@]rd/i,
  /r[e3][t7][a4@]rded/i,
  // F-word variations - catches embedded
  /f[uµ][cçk]+/i,
  // Rape variations - simple pattern (accepting some false positives for security)
  /r[a4@]p[e3]/i,
];

const DOUBLE_PUNCTUATION = /[_-]{2,}/;
const TRAILING_PUNCT = /[_-]$/;

function containsObscenity(text: string): boolean {
  const normalized = text.toLowerCase();
  return OBSCENE_PATTERNS.some((rx) => rx.test(normalized));
}

function normalizeForReserveCompare(text: string): string {
  const map: Record<string, string> = {
    "0": "o", "1": "i", "!": "i", "l": "l", "3": "e", "4": "a", "@": "a",
    "5": "s", "$": "s", "7": "t", "8": "b", "9": "g", "µ": "u", "ç": "c",
  };
  
  return text
    .toLowerCase()
    .replace(/[_-\s]/g, "")
    .split("")
    .map((ch) => map[ch] ?? ch)
    .join("");
}

function conflictsWithReserved(text: string, reservedWords: string[]): string | null {
  const reservedSet = new Set(reservedWords.map((s) => s.toLowerCase()));
  const folded = normalizeForReserveCompare(text);
  
  // Direct check
  if (reservedSet.has(text.toLowerCase())) return text.toLowerCase();
  
  // Folded check (catches 0fficial -> official)
  for (const reserved of reservedSet) {
    if (folded === reserved) return reserved;
  }
  
  return null;
}

export function validateContent(raw: string, config: ContentValidationConfig): ValidationResult {
  const contextName = config.contextName || "content";
  
  if (!raw) {
    return { 
      ok: false, 
      code: "empty", 
      message: `${contextName} cannot be empty.` 
    };
  }

  const content = config.customNormalizer ? config.customNormalizer(raw.trim()) : raw.trim();

  // Length validation
  if (content.length < config.lengthMin) {
    return { 
      ok: false, 
      code: "too_short", 
      message: `${contextName} must be at least ${config.lengthMin} characters.` 
    };
  }
  
  if (content.length > config.lengthMax) {
    return { 
      ok: false, 
      code: "too_long", 
      message: `${contextName} must be at most ${config.lengthMax} characters.` 
    };
  }

  // Format validation
  if (config.formatRegex && !config.formatRegex.test(content)) {
    return {
      ok: false,
      code: "bad_charset",
      message: `${contextName} contains invalid characters.`
    };
  }

  // Double punctuation check
  if (!config.allowDoublePunctuation && DOUBLE_PUNCTUATION.test(content)) {
    return { 
      ok: false, 
      code: "double_punct", 
      message: `${contextName} cannot contain consecutive underscores or hyphens.` 
    };
  }

  // Trailing punctuation check
  if (!config.allowTrailingPunctuation && TRAILING_PUNCT.test(content)) {
    return { 
      ok: false, 
      code: "trailing_punct", 
      message: `${contextName} cannot end with an underscore or hyphen.` 
    };
  }

  // Obscenity check
  if (config.checkObscenity !== false && containsObscenity(content)) {
    return { 
      ok: false, 
      code: "obscene", 
      message: `This ${contextName.toLowerCase()} contains disallowed language.` 
    };
  }

  // Reserved words check
  if (config.reservedWords && config.reservedWords.length > 0) {
    const reservedHit = conflictsWithReserved(content, config.reservedWords);
    if (reservedHit) {
      return {
        ok: false,
        code: "reserved",
        message: `This ${contextName.toLowerCase()} is reserved or may cause confusion. Please choose another.`,
        matched: reservedHit,
      };
    }
  }

  return { ok: true, normalized: content };
}