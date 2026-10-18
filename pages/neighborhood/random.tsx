// "A random house": sends you to one pixel home picked at random.
import type { GetServerSideProps } from 'next'
import { db } from '@/lib/config/database/connection'
import { getSessionUser } from '@/lib/auth/server'
import { visibleResidentWhere } from '@/lib/domain/users/profile-access'

export default function RandomHouse() {
  return null
}

export const getServerSideProps: GetServerSideProps = async ({ req, res }) => {
  // A fresh pick every time, never a cached one
  res.setHeader('Cache-Control', 'no-store')

  // Only homes the viewer may see (profile visibility, blocks)
  const viewer = await getSessionUser(req as any)
  const where = { user: { handles: { some: {} }, ...visibleResidentWhere(viewer?.id) } }
  const count = await db.userHomeConfig.count({ where })
  if (count === 0) {
    return { redirect: { destination: '/neighborhood', permanent: false } }
  }

  const home = await db.userHomeConfig.findFirst({
    where,
    skip: Math.floor(Math.random() * count),
    orderBy: { userId: 'asc' },
    select: { user: { select: { handles: { select: { handle: true, host: true } } } } },
  })
  const handles = home?.user.handles ?? []
  const handle = (handles.find((h) => h.host === 'threadstead.com') || handles[0])?.handle

  return {
    redirect: {
      destination: handle ? `/home/${encodeURIComponent(handle)}` : '/neighborhood',
      permanent: false,
    },
  }
}
