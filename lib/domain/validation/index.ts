// Import for internal use
import { ValidationResult } from "./content";
import { validateUsername } from "./username";
import { validateThreadRingName } from "./threadring-name";
import { validatePostTitle } from "./post-title";

// Main validation module - exports all validation functions
export { validateUsername, type UsernameValidationResult, type UsernameValidationErrorCode } from "./username";
export { validateThreadRingName, generateThreadRingSlug } from "./threadring-name";
export { validatePostTitle } from "./post-title";
export { 
  validateContent, 
  type ValidationResult, 
  type ValidationErrorCode, 
  type ContentValidationConfig 
} from "./content";

// Convenience function to validate multiple content types
export function validateAll(content: {
  username?: string;
  threadRingName?: string;
  postTitle?: string;
}) {
  const results: Record<string, ValidationResult> = {};
  
  if (content.username !== undefined) {
    results.username = validateUsername(content.username);
  }
  
  if (content.threadRingName !== undefined) {
    results.threadRingName = validateThreadRingName(content.threadRingName);
  }
  
  if (content.postTitle !== undefined) {
    results.postTitle = validatePostTitle(content.postTitle);
  }
  
  return results;
}