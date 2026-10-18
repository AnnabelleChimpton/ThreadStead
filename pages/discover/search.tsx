import type { GetServerSideProps } from 'next'
import { legacyRedirectHref } from '@/lib/search/url-state'

/**
 * /discover/search was the old search page. It now redirects to /search,
 * keeping the query and mapping ?tab= / ?type= onto a scope.
 */
export default function DiscoverSearchRedirect() {
  return null
}

export const getServerSideProps: GetServerSideProps = async (context) => ({
  redirect: { destination: legacyRedirectHref(context.query), permanent: false },
})
