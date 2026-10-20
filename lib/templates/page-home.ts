/**
 * The owner's pixel home, for <MyHouse />, <HouseBadge /> and <RingNav /> on a
 * page of your own HTML (pages/resident/[username]/index.tsx puts it in
 * residentData.pixelHome).
 *
 * All local: the home is a UserHomeConfig row, its house number is its place
 * on the street (lib/pixel-homes/street.ts), and the yard picture is the
 * share snapshot already stored on the row (lib/pixel-homes/snapshot). Read
 * only, and only when the page uses one of those components. Who may see the
 * home is who may see the page: the profile API has already checked that
 * (lib/domain/users/profile-access.ts), and homes follow the same rules.
 */
import type { PrismaClient } from '@prisma/client';
import type { ColorPalette, HouseCustomizations, HouseTemplate } from '@/components/pixel-homes/HouseSVG';
import { SITE_NAME } from '@/lib/config/site/constants';

/** residentData.pixelHome: null means no home; left out means not loaded (the editor preview). */
export interface PageHome {
  template: HouseTemplate;
  palette: ColorPalette;
  customizations: HouseCustomizations;
  /** House number on the street, or null when it has none (no local handle) */
  number: number | null;
  /** The 512×352 yard picture on the CDN, or null when it hasn't been drawn */
  snapshotCardUrl: string | null;
}

/** The components that read residentData.pixelHome */
export const PAGE_HOME_COMPONENTS = ['MyHouse', 'HouseBadge', 'RingNav'] as const;

/** Whether a stored compile result has an island of one of these components (islands may store names lower case). */
export function pageUsesAny(compiled: unknown, names: readonly string[]): boolean {
  const islands = (compiled as { islands?: unknown } | null | undefined)?.islands;
  if (!Array.isArray(islands)) return false;
  const wanted = new Set(names.map((n) => n.toLowerCase()));
  return islands.some(
    (island) =>
      typeof (island as { component?: unknown })?.component === 'string' &&
      wanted.has((island as { component: string }).component.toLowerCase())
  );
}

type Db = Pick<PrismaClient, 'userHomeConfig' | 'user' | '$queryRaw'>;

/** The owner's home, or null when they have none. */
export async function pageHomeFor(db: Db, userId: string, host: string = SITE_NAME): Promise<PageHome | null> {
  const config = await db.userHomeConfig.findUnique({ where: { userId } });
  if (!config) return null;
  const [{ houseCustomizationsFromConfig }, { houseNumbersOf }] = await Promise.all([
    import('@/lib/pixel-homes/home-scene'),
    import('@/lib/pixel-homes/street'),
  ]);
  const numbers = await houseNumbersOf(db, [userId], host);
  return {
    template: config.houseTemplate as HouseTemplate,
    palette: config.palette as ColorPalette,
    customizations: houseCustomizationsFromConfig(config),
    number: numbers.get(userId) ?? null,
    snapshotCardUrl: config.snapshotCardUrl ?? null,
  };
}

/**
 * For the profile page: the home when the page uses a component that shows
 * it, null when there's no home, undefined when no component needs it.
 */
export async function pageHomeIfUsed(
  compiled: unknown,
  userId: string,
  hasPixelHome: boolean,
  db?: Db
): Promise<PageHome | null | undefined> {
  if (!pageUsesAny(compiled, PAGE_HOME_COMPONENTS)) return undefined;
  if (!hasPixelHome) return null;
  const client = db ?? (await import('@/lib/config/database/connection')).db;
  return pageHomeFor(client, userId);
}
