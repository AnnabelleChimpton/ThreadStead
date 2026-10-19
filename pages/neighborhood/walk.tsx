// A ring signpost's prev / random / next: sends you to the ring's next
// member home along the street (lib/pixel-homes/ring-walk.ts).
// /neighborhood/walk?ring=<slug>&from=<house number>&go=next|prev|random
import type { GetServerSideProps } from 'next'
import { db } from '@/lib/config/database/connection'
import { getSessionUser } from '@/lib/auth/server'
import { SITE_NAME } from '@/lib/config/site/constants'
import { walkTarget, type WalkDirection } from '@/lib/pixel-homes/ring-walk'

const SLUG = /^[a-z0-9][a-z0-9-]{0,99}$/
const DIRECTIONS: WalkDirection[] = ['next', 'prev', 'random']

export default function RingWalk() {
  return null
}

export const getServerSideProps: GetServerSideProps = async ({ req, res, query }) => {
  // Random differs every time, and who may see which home depends on the viewer
  res.setHeader('Cache-Control', 'no-store')

  const slug = typeof query.ring === 'string' ? query.ring : ''
  const go = DIRECTIONS.find((d) => d === query.go) ?? 'next'
  const from = Number.parseInt(typeof query.from === 'string' ? query.from : '0', 10)
  if (!SLUG.test(slug)) return { redirect: { destination: '/neighborhood', permanent: false } }

  const ringPage = `/tr/${encodeURIComponent(slug)}`
  try {
    const viewer = await getSessionUser(req as any)
    const result = await walkTarget(db, {
      slug,
      from: Number.isFinite(from) && from > 0 ? from : 0,
      go,
      viewerId: viewer?.id,
      host: SITE_NAME,
    })
    // No member home to show (or no answer from the hub): the ring's own page
    const destination = result.kind === 'home' ? `/home/${encodeURIComponent(result.handle)}` : ringPage
    return { redirect: { destination, permanent: false } }
  } catch (error) {
    console.error('Ring walk failed:', error)
    return { redirect: { destination: ringPage, permanent: false } }
  }
}
