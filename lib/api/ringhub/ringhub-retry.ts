/**
 * Retry utility for RingHub operations with exponential backoff
 *
 * This is particularly useful for handling initial user registration flows
 * where RingHub may auto-register a user on first request but return an error,
 * requiring a retry to complete the operation successfully.
 */

export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  shouldRetry?: (error: any) => boolean;
}

/**
 * Default retry condition - only retry on genuine "actor not yet registered" signals.
 *
 * NARROWED (was: retry on ANY 401/403): treating all 401/403 as retryable meant a
 * stale-key signature failure or a legitimate 403 (permission denied) got pointlessly
 * retried, delaying the real error and hammering the hub. RingHub auto-registers an
 * actor on first contact and may return a transient "not yet registered" error that a
 * retry resolves — those are the ONLY cases we retry now.
 *
 * We deliberately do NOT retry on generic 'authentication failed' /
 * 'signature verification failed' — those indicate a real key/identity problem
 * (stale key), which retrying cannot fix.
 */
export function isRegistrationError(error: any): boolean {
  const errorMessage = error.message?.toLowerCase() || '';
  const code = (error.code || '').toString().toLowerCase();

  // Explicit "actor pending / not yet registered" signals only.
  const pendingRegistrationCodes = [
    'actor_not_registered',
    'actor_pending_registration',
    'registration_pending',
  ];
  if (pendingRegistrationCodes.includes(code)) {
    return true;
  }

  const pendingRegistrationKeywords = [
    'actor not registered',
    'actor not yet registered',
    'not yet registered',
    'registration pending',
    'unknown actor',
  ];

  return pendingRegistrationKeywords.some(keyword => errorMessage.includes(keyword));
}

/**
 * Retry a function with exponential backoff
 *
 * @param fn - The async function to retry
 * @param options - Retry configuration options
 * @returns Promise that resolves with the function result or throws the last error
 *
 * @example
 * ```typescript
 * const result = await retryWithBackoff(
 *   () => ringHubClient.joinRing('my-ring'),
 *   { maxRetries: 3, baseDelay: 500 }
 * );
 * ```
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 500,
    shouldRetry = isRegistrationError,
  } = options;

  let lastError: any;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await fn();

      // Log success if this was a retry (not the first attempt)
      if (attempt > 0) {
        console.log(`✅ Operation succeeded on retry attempt ${attempt + 1}/${maxRetries}`);
      }

      return result;
    } catch (error: any) {
      lastError = error;

      // Check if we should retry this error
      const isRetryable = shouldRetry(error);
      const isLastAttempt = attempt === maxRetries - 1;

      // Log the error details
      console.error(`❌ Attempt ${attempt + 1}/${maxRetries} failed:`, {
        status: error.status,
        message: error.message,
        retryable: isRetryable,
      });

      // Don't retry if:
      // 1. This is not a retryable error, OR
      // 2. We've exhausted all retry attempts
      if (!isRetryable || isLastAttempt) {
        if (!isRetryable) {
          console.log('🚫 Error is not retryable, throwing immediately');
        } else {
          console.log('🚫 Max retries exhausted, throwing error');
        }
        throw error;
      }

      // Calculate delay with exponential backoff: 500ms, 1000ms, 2000ms, etc.
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`⏳ Retrying in ${delay}ms... (attempt ${attempt + 2}/${maxRetries})`);

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // This should never be reached, but TypeScript requires it
  throw lastError;
}
