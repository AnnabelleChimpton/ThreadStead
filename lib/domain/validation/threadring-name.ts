import { validateContent, ValidationResult } from "./content";

const LENGTH_MIN = 2;
const LENGTH_MAX = 50;

const RESERVED_RING_NAMES: string[] = [
  // System/core terms
  "admin", "administrator", "system", "api", "www", "mail", "root",
  "support", "help", "staff", "team", "official", "moderator", "mod",
  
  // Project-specific
  "threadstead", "ringhub", "federation", "spool", "the-spool",
  
  // Common routes that might conflict
  "about", "docs", "contact", "privacy", "terms", "status", 
  "login", "logout", "signup", "settings", "profile", "feed",
  "trending", "recent", "directory", "search",
  
  // Meta terms
  "thread", "ring", "threadring", "group", "community", "forum",
  "chat", "discussion", "general", "main", "default", "home",
  
  // Potentially offensive/problematic
  "hate", "nazi", "fascist", "terrorist", "porn", "sex", "adult",
];

function slugifyForThreadRing(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function validateThreadRingName(raw: string): ValidationResult {
  const result = validateContent(raw, {
    lengthMin: LENGTH_MIN,
    lengthMax: LENGTH_MAX,
    allowDoublePunctuation: true, // Allow in names, will be cleaned in slug
    allowTrailingPunctuation: true, // Allow in names, will be cleaned in slug
    checkObscenity: true,
    reservedWords: RESERVED_RING_NAMES,
    contextName: "ThreadRing name"
  });
  
  if (!result.ok) {
    return result;
  }
  
  // Additional check: ensure the slugified version isn't empty
  const slug = slugifyForThreadRing(result.normalized);
  if (!slug || slug.length < 1) {
    return {
      ok: false,
      code: "invalid_format",
      message: "ThreadRing name must contain at least one letter or number."
    };
  }
  
  return result;
}

export function generateThreadRingSlug(name: string): string {
  return slugifyForThreadRing(name);
}