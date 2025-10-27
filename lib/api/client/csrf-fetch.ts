/**
 * CSRF-Protected Fetch Utility
 *
 * Automatically includes CSRF token in requests.
 * Use this instead of native fetch() for all authenticated API calls.
 */

/**
 * Extract CSRF token from cookies
 */
export function getCsrfToken(): string | null {
  if (typeof document === "undefined") {
    return null; // Server-side
  }

  const cookie = document.cookie;
  const match = cookie.match(/csrf_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Fetch with automatic CSRF token inclusion
 *
 * Auto-generates CSRF token for authenticated users who don't have one yet.
 * This handles migration for existing users who logged in before CSRF was implemented.
 *
 * Usage:
 *   const response = await csrfFetch('/api/posts/create', {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify({ content: 'Hello!' })
 *   });
 */
export async function csrfFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const method = init?.method?.toUpperCase() || "GET";
  const needsCsrfToken = method !== "GET" && method !== "HEAD" && method !== "OPTIONS";

  // Check if we need a CSRF token but don't have one
  let csrfToken = getCsrfToken();

  if (needsCsrfToken && !csrfToken) {
    // Try to auto-generate token for authenticated users
    try {
      const tokenResponse = await fetch("/api/csrf/token", {
        method: "GET",
        credentials: "include", // Include session cookie
      });

      if (tokenResponse.ok) {
        // Token was generated and set in cookie
        // Re-read the token from the cookie
        csrfToken = getCsrfToken();

        if (!csrfToken) {
          console.error("CSRF token generation succeeded but token not found in cookie");
        }
      } else if (tokenResponse.status === 401) {
        // User is not logged in - let the original request fail with proper auth error
        console.warn("User not authenticated - cannot generate CSRF token");
      } else {
        console.error("Failed to auto-generate CSRF token:", tokenResponse.status);
      }
    } catch (error) {
      console.error("Error auto-generating CSRF token:", error);
      // Continue with request - it will likely fail with 403, which is appropriate
    }
  }

  // Merge headers with CSRF token
  const headers = new Headers(init?.headers || {});

  // Add CSRF token for state-changing methods
  if (needsCsrfToken) {
    if (csrfToken) {
      headers.set("X-CSRF-Token", csrfToken);
    } else {
      console.warn(
        "CSRF token not found. Request may fail. Please ensure you are logged in."
      );
    }
  }

  // Make request with CSRF token
  return fetch(input, {
    ...init,
    headers,
  });
}

/**
 * Helper for JSON API requests with CSRF protection
 *
 * Usage:
 *   const data = await csrfFetchJson('/api/posts/create', {
 *     method: 'POST',
 *     body: { content: 'Hello!' }
 *   });
 */
export async function csrfFetchJson<T = any>(
  input: RequestInfo | URL,
  init?: Omit<RequestInit, "body"> & { body?: any }
): Promise<T> {
  const headers = new Headers(init?.headers || {});
  headers.set("Content-Type", "application/json");

  const response = await csrfFetch(input, {
    ...init,
    headers,
    body: init?.body ? JSON.stringify(init.body) : undefined,
  });

  if (!response.ok) {
    const error: any = new Error(`HTTP ${response.status}: ${response.statusText}`);
    error.status = response.status;
    error.response = response;

    // Try to parse error message from response
    try {
      const errorData = await response.json();
      error.message = errorData.error || errorData.message || error.message;
      error.data = errorData;
    } catch {
      // Response not JSON, use status text
    }

    throw error;
  }

  return response.json();
}

/**
 * Re-export as default for convenience
 */
export default csrfFetch;
