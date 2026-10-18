import { Prisma } from '@prisma/client'

/**
 * A Date for raw SQL against Prisma's `timestamp(3)` columns. Prisma binds a
 * Date as timestamptz, and Postgres turns that into a plain timestamp in the
 * session's time zone, which is only right when the server runs in UTC.
 * Prisma's own queries store UTC, so pin it.
 */
export function utc(date: Date): Prisma.Sql {
  return Prisma.sql`(${date}::timestamptz AT TIME ZONE 'UTC')`
}
