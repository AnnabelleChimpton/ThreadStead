import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Build connection URL with pool configuration
const buildConnectionUrl = () => {
  const baseUrl = process.env.DATABASE_URL || ''
  // Add connection pool settings if not already present
  if (baseUrl.includes('?')) {
    return `${baseUrl}&connection_limit=20&pool_timeout=10`
  }
  return `${baseUrl}?connection_limit=20&pool_timeout=10`
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error'],
    datasources: {
      db: {
        url: buildConnectionUrl(),
      },
    },
  })

// Cache the client in ALL environments to prevent connection pool exhaustion
globalForPrisma.prisma = db