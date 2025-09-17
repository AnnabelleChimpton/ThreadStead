/**
 * Search redirect page
 * Redirects to /discover with query parameters preserved
 */

import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';

export default function SearchRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Build query string from all query parameters
    const queryParams = new URLSearchParams();

    // Map common search param names to discover page params
    if (router.query.q || router.query.query) {
      queryParams.set('q', (router.query.q || router.query.query) as string);
    }

    // Preserve tab selection
    if (router.query.tab) {
      queryParams.set('tab', router.query.tab as string);
    }

    // Preserve type selection
    if (router.query.type) {
      queryParams.set('type', router.query.type as string);
    }

    // Preserve filter flags
    if (router.query.indie) {
      queryParams.set('indie', router.query.indie as string);
    }
    if (router.query.privacy) {
      queryParams.set('privacy', router.query.privacy as string);
    }
    if (router.query.noTrackers) {
      queryParams.set('noTrackers', router.query.noTrackers as string);
    }
    if (router.query.includeUnvalidated) {
      queryParams.set('includeUnvalidated', router.query.includeUnvalidated as string);
    }

    // Redirect to discover page with parameters
    const queryString = queryParams.toString();
    const redirectUrl = queryString ? `/discover?${queryString}` : '/discover';
    router.replace(redirectUrl);
  }, [router]);

  // Show loading state while redirecting
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to search...</p>
      </div>
    </div>
  );
}

// Server-side redirect for better performance
export const getServerSideProps: GetServerSideProps = async (context) => {
  const { query } = context;

  // Build query string from all query parameters
  const queryParams = new URLSearchParams();

  // Map common search param names to discover page params
  if (query.q || query.query) {
    queryParams.set('q', (query.q || query.query) as string);
  }

  // Preserve tab selection
  if (query.tab) {
    queryParams.set('tab', query.tab as string);
  }

  // Preserve type selection
  if (query.type) {
    queryParams.set('type', query.type as string);
  }

  // Preserve filter flags
  if (query.indie) {
    queryParams.set('indie', query.indie as string);
  }
  if (query.privacy) {
    queryParams.set('privacy', query.privacy as string);
  }
  if (query.noTrackers) {
    queryParams.set('noTrackers', query.noTrackers as string);
  }
  if (query.includeUnvalidated) {
    queryParams.set('includeUnvalidated', query.includeUnvalidated as string);
  }

  // Redirect to discover page with parameters
  const queryString = queryParams.toString();
  const redirectUrl = queryString ? `/discover?${queryString}` : '/discover';

  return {
    redirect: {
      destination: redirectUrl,
      permanent: false, // Use temporary redirect (302) so search engines know this might change
    },
  };
};