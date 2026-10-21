import { Prisma, type PrismaClient } from "@prisma/client";
import { visibleResidentWhere } from "@/lib/domain/users/profile-access";
import type { HouseTemplate, ColorPalette, HouseCustomizations } from "@/components/pixel-homes/HouseSVG";

/**
 * The street: every pixel home in the order people moved in.
 *
 * Each home's house number is its place in join order among all local homes
 * (1 = the first resident), so it never changes when someone saves their
 * yard. Streets are runs of HOUSES_PER_STREET numbers, each with a fixed
 * name. Homes the viewer may not see are left out of their street, leaving
 * a gap in the numbers rather than shifting everyone else.
 */

export const HOUSES_PER_STREET = 24;

const STREET_NAMES = [
  "Pine Street", "Oak Avenue", "Maple Drive", "Cedar Lane", "Birch Boulevard",
  "Elm Street", "Cherry Lane", "Willow Way", "Aspen Avenue", "Spruce Street",
  "Poplar Place", "Hickory Lane", "Dogwood Drive", "Sycamore Street", "Walnut Way",
];

/** Street index (0-based) → its name; after the list runs out, "Pine Street 2" and so on. */
export function streetName(index: number): string {
  const base = STREET_NAMES[index % STREET_NAMES.length];
  const round = Math.floor(index / STREET_NAMES.length);
  return round === 0 ? base : `${base} ${round + 1}`;
}

/** Which street (0-based) a house number is on. */
export function streetOfNumber(number: number): number {
  return Math.floor((number - 1) / HOUSES_PER_STREET);
}

export interface StreetHome {
  userId: string;
  username: string;
  displayName: string | null;
  number: number;
  /** 512×352 picture of the whole yard at 1x, when one has been drawn */
  snapshotCardUrl: string | null;
  /** For drawing the house when there's no snapshot yet */
  houseTemplate: HouseTemplate;
  palette: ColorPalette;
  houseCustomizations: HouseCustomizations;
  decorationCount: number;
}

export interface StreetPage {
  /** 0-based */
  index: number;
  name: string;
  /** Streets in total (at least 1) */
  streetCount: number;
  /** Homes on the whole street, for honest counts */
  totalHomes: number;
  homes: StreetHome[];
  previous: { index: number; name: string } | null;
  next: { index: number; name: string } | null;
}

type Db = Pick<PrismaClient, "$queryRaw" | "user" | "userHomeConfig">;

const homeSelect = {
  id: true,
  handles: { select: { handle: true, host: true } },
  profile: { select: { displayName: true } },
  homeConfig: {
    select: {
      houseTemplate: true,
      palette: true,
      snapshotCardUrl: true,
      windowStyle: true,
      doorStyle: true,
      roofTrim: true,
      wallColor: true,
      roofColor: true,
      trimColor: true,
      windowColor: true,
      detailColor: true,
      houseBoardText: true,
      houseNumber: true,
      houseNumberStyle: true,
      welcomeMat: true,
      welcomeMatText: true,
      welcomeMatColor: true,
      chimneyStyle: true,
      exteriorLights: true,
      windowTreatments: true,
      _count: { select: { decorations: true } },
    },
  },
} satisfies Prisma.UserSelect;

type HomeRow = Prisma.UserGetPayload<{ select: typeof homeSelect }>;

function toStreetHome(row: HomeRow, number: number, host: string): StreetHome | null {
  const handle = row.handles.find((h) => h.host === host);
  const config = row.homeConfig;
  if (!handle || !config) return null;
  const { _count, snapshotCardUrl, houseTemplate, palette, ...custom } = config;
  const houseCustomizations = Object.fromEntries(
    Object.entries(custom).filter(([, value]) => value !== null && value !== "")
  ) as HouseCustomizations;
  return {
    userId: row.id,
    username: handle.handle,
    displayName: row.profile?.displayName ?? null,
    number,
    snapshotCardUrl,
    houseTemplate: houseTemplate as HouseTemplate,
    palette: palette as ColorPalette,
    houseCustomizations,
    decorationCount: _count.decorations,
  };
}

/** House numbers for a range of the street, plus how many homes there are in all. */
async function numberedRange(db: Db, host: string, from: number, to: number) {
  const rows = await db.$queryRaw<{ id: string; number: bigint; total: bigint }[]>`
    WITH numbered AS (
      SELECT u."id",
             ROW_NUMBER() OVER (ORDER BY u."createdAt", u."id") AS number,
             COUNT(*) OVER () AS total
      FROM "User" u
      JOIN "UserHomeConfig" c ON c."userId" = u."id"
      WHERE EXISTS (SELECT 1 FROM "Handle" h WHERE h."userId" = u."id" AND h."host" = ${host})
    )
    SELECT "id", number, total FROM numbered
    WHERE number BETWEEN ${from} AND ${to} OR number = 1
  `;
  const total = rows.length > 0 ? Number(rows[0].total) : 0;
  const numbers = new Map(
    rows.filter((r) => Number(r.number) >= from && Number(r.number) <= to).map((r) => [r.id, Number(r.number)])
  );
  return { total, numbers };
}

/** The homes among `numbers` (userId → house number) the viewer may visit, in house-number order. */
async function visibleHomes(
  db: Db,
  numbers: Map<string, number>,
  viewerId: string | null | undefined,
  host: string
): Promise<StreetHome[]> {
  if (numbers.size === 0) return [];
  const rows = await db.user.findMany({
    where: { AND: [{ id: { in: [...numbers.keys()] } }, visibleResidentWhere(viewerId)] },
    select: homeSelect,
  });
  return rows
    .map((row) => toStreetHome(row, numbers.get(row.id)!, host))
    .filter((home): home is StreetHome => home !== null)
    .sort((a, b) => a.number - b.number);
}

/** One street of homes the viewer may visit, in house-number order. */
export async function getStreetPage(
  db: Db,
  { index, viewerId, host }: { index: number; viewerId: string | null | undefined; host: string }
): Promise<StreetPage> {
  const safeIndex = Math.max(0, Math.floor(index));
  const from = safeIndex * HOUSES_PER_STREET + 1;
  const to = from + HOUSES_PER_STREET - 1;
  const { total, numbers } = await numberedRange(db, host, from, to);
  const streetCount = Math.max(1, Math.ceil(total / HOUSES_PER_STREET));
  const clamped = Math.min(safeIndex, streetCount - 1);
  if (clamped !== safeIndex) return getStreetPage(db, { index: clamped, viewerId, host });

  const homes = await visibleHomes(db, numbers, viewerId, host);

  return {
    index: clamped,
    name: streetName(clamped),
    streetCount,
    totalHomes: total,
    homes,
    previous: clamped > 0 ? { index: clamped - 1, name: streetName(clamped - 1) } : null,
    next: clamped < streetCount - 1 ? { index: clamped + 1, name: streetName(clamped + 1) } : null,
  };
}

/** The street (0-based) a resident's house is on, or null if they have no pixel home. */
export async function streetIndexOf(db: Db, userId: string, host: string): Promise<number | null> {
  const rows = await db.$queryRaw<{ number: bigint }[]>`
    WITH numbered AS (
      SELECT u."id", ROW_NUMBER() OVER (ORDER BY u."createdAt", u."id") AS number
      FROM "User" u
      JOIN "UserHomeConfig" c ON c."userId" = u."id"
      WHERE EXISTS (SELECT 1 FROM "Handle" h WHERE h."userId" = u."id" AND h."host" = ${host})
    )
    SELECT number FROM numbered WHERE "id" = ${userId}
  `;
  return rows.length ? streetOfNumber(Number(rows[0].number)) : null;
}

/**
 * House numbers (join order) for some residents, leaving out anyone without
 * a pixel home or a local handle. Used to walk a ring's homes in street order.
 */
export async function houseNumbersOf(db: Db, userIds: string[], host: string): Promise<Map<string, number>> {
  if (userIds.length === 0) return new Map();
  const rows = await db.$queryRaw<{ id: string; number: bigint }[]>`
    WITH numbered AS (
      SELECT u."id", ROW_NUMBER() OVER (ORDER BY u."createdAt", u."id") AS number
      FROM "User" u
      JOIN "UserHomeConfig" c ON c."userId" = u."id"
      WHERE EXISTS (SELECT 1 FROM "Handle" h WHERE h."userId" = u."id" AND h."host" = ${host})
    )
    SELECT "id", number FROM numbered WHERE "id" = ANY(${userIds})
  `;
  return new Map(rows.map((r) => [r.id, Number(r.number)]));
}

/**
 * Some residents' homes as a street of their own (a ring's members, say),
 * keeping each house's number from the main street. Leaves out anyone
 * without a pixel home or a local handle, and homes the viewer may not see.
 */
export async function getHomesOf(
  db: Db,
  { userIds, viewerId, host }: { userIds: string[]; viewerId: string | null | undefined; host: string }
): Promise<StreetHome[]> {
  return visibleHomes(db, await houseNumbersOf(db, userIds, host), viewerId, host);
}

/**
 * Yards people have been working on lately: decorated homes, most recently
 * saved first. Kept apart from the street so saving never reshuffles it.
 */
export async function getRecentlyDecorated(
  db: Db,
  { viewerId, host, take = 8 }: { viewerId: string | null | undefined; host: string; take?: number }
): Promise<Array<Pick<StreetHome, "username" | "displayName" | "snapshotCardUrl">>> {
  const configs = await db.userHomeConfig.findMany({
    where: {
      decorations: { some: {} },
      snapshotCardUrl: { not: null },
      user: { AND: [{ handles: { some: { host } } }, visibleResidentWhere(viewerId)] },
    },
    orderBy: { updatedAt: "desc" },
    take,
    select: {
      snapshotCardUrl: true,
      user: { select: { handles: { where: { host }, select: { handle: true }, take: 1 }, profile: { select: { displayName: true } } } },
    },
  });
  return configs
    .filter((c) => c.user.handles[0])
    .map((c) => ({
      username: c.user.handles[0].handle,
      displayName: c.user.profile?.displayName ?? null,
      snapshotCardUrl: c.snapshotCardUrl,
    }));
}

/**
 * A resident's lot with up to `count` neighbours from their own street: the
 * nearest house on each side first, then the next nearest on whichever side
 * has more. The newest resident has nobody after them, so they get the two
 * houses before theirs. In house-number order.
 */
export function withNeighbours(homes: StreetHome[], userId: string, count = 2): StreetHome[] {
  const me = homes.find((home) => home.userId === userId);
  if (!me) return [];
  const before = homes.filter((home) => home.number < me.number).sort((a, b) => b.number - a.number);
  const after = homes.filter((home) => home.number > me.number).sort((a, b) => a.number - b.number);
  const picked: StreetHome[] = [];
  while (picked.length < count && (before.length || after.length)) {
    const fromBefore = before.length && (!after.length || picked.length % 2 === 0);
    picked.push((fromBefore ? before : after).shift()!);
  }
  return [...picked, me].sort((a, b) => a.number - b.number);
}

export interface Arrival {
  number: number;
  street: { index: number; name: string };
  /** Their lot and their nearest neighbours, in house-number order */
  homes: StreetHome[];
}

/**
 * Where a resident lives on the street, for signup's "Move in": their house
 * number, their street, and the neighbours either side. Null without a home.
 */
export async function getArrival(db: Db, { userId, host }: { userId: string; host: string }): Promise<Arrival | null> {
  const number = (await houseNumbersOf(db, [userId], host)).get(userId);
  if (!number) return null;
  const street = await getStreetPage(db, { index: streetOfNumber(number), viewerId: userId, host });
  const homes = withNeighbours(street.homes, userId);
  if (homes.length === 0) return null;
  return { number, street: { index: street.index, name: street.name }, homes };
}
