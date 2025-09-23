import { validateContent, ValidationResult, ValidationErrorCode } from "./content";

const LENGTH_MIN = 3;
const LENGTH_MAX = 32;

// Allowed: lowercase letters, numbers, underscore, hyphen; must start with a letter
const FORMAT_REGEX = /^[a-z][a-z0-9_-]*$/;

const RESERVED_USERNAMES: string[] = [
  // Core system / roles
  "admin","administrator","root","system","null","everyone","owner",
  "mod","moderator","staff","team","official","support","help",

  // Project-specific
  "threadstead","homepageagain","ringhub","federation",

  // Common top-level routes / SEO pages
  "about","docs","api","www","mail","contact","privacy","terms","status","login","logout","signup",
];

// Re-export types for backward compatibility
export type UsernameValidationErrorCode = ValidationErrorCode;
export type UsernameValidationResult = ValidationResult;

export function validateUsername(raw: string): ValidationResult {
  return validateContent(raw, {
    lengthMin: LENGTH_MIN,
    lengthMax: LENGTH_MAX,
    formatRegex: FORMAT_REGEX,
    allowDoublePunctuation: false,
    allowTrailingPunctuation: false,
    checkObscenity: true,
    reservedWords: RESERVED_USERNAMES,
    contextName: "Username"
  });
}