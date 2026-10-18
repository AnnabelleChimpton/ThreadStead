// "A random house": sends you to one pixel home picked at random.
import type { GetServerSideProps } from 'next'
import { db } from '@/lib/config/database/connection'

export default function RandomHouse() {
  return null
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  // A fresh pick every time, never a cached one
  res.setHeader('Cache-Control', 'no-store')

  const where = { user: { handles: { some: {} } } }
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
