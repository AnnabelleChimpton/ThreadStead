// Import for internal use
import { ValidationResult } from "./content-validation";
import { validateUsername } from "./validateUsername";
import { validateThreadRingName } from "./validateThreadRingName";
import { validatePostTitle } from "./validatePostTitle";

// Main validation module - exports all validation functions
export { validateUsername, type UsernameValidationResult, type UsernameValidationErrorCode } from "./validateUsername";
export { validateThreadRingName, generateThreadRingSlug } from "./validateThreadRingName";
export { validatePostTitle } from "./validatePostTitle";
export { 
  validateContent, 
  type ValidationResult, 
  type ValidationErrorCode, 
  type ContentValidationConfig 
} from "./content-validation";

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