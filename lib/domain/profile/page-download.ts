/**
 * "Download my page" (Settings, Your page): the owner's page as a zip they
 * can keep or host somewhere else (GET /api/user/export/page).
 *
 *   index.html   their template source, with a short comment on top saying
 *                what it is (only when they have a template)
 *   style.css    their CSS (only when they have some)
 *   README.txt   instead of index.html, when there's no template: what's in
 *                the zip and why there's no HTML
 *   images/…     pictures the template or CSS uses that they uploaded here,
 *                with those addresses in index.html / style.css pointing at
 *                images/<file> instead
 *
 * Pictures are read from the public CDN, the address the page already uses.
 * Read only: nothing is written to storage. Only addresses under this site's
 * storage (lib/storage/r2.ts keyFromPublicUrl) in the owner's own upload
 * folders are fetched; anything else stays as it was. The zip is capped at
 * PAGE_DOWNLOAD_MAX_BYTES; pictures past the cap keep their web address.
 */
import { createStoredZip, type ZipEntry } from '@/lib/utils/zip/stored-zip';

export const PAGE_DOWNLOAD_MAX_BYTES = 50 * 1024 * 1024;
export const PAGE_DOWNLOAD_MAX_IMAGES = 200;
const FETCH_TIMEOUT_MS = 10_000;

/** What the zip is made from (Profile and the owner's handle) */
export interface PageDownloadSource {
  userId: string;
  handle: string;
  templateMode: string | null;
  customTemplate: string | null;
  customCSS: string | null;
}

/** The two storage helpers it uses (lib/storage/r2.ts) */
export interface PageDownloadStorage {
  keyFromPublicUrl(url: string): string | null;
  publicUrl(key: string): string;
}

/** Reads one picture, at most `maxBytes` of it: 'too-big' past that, null when it can't be read. */
export type ImageReader = (
  url: string,
  maxBytes: number
) => Promise<{ bytes: Buffer; contentType: string } | 'too-big' | null>;

export interface PageDownload {
  zip: Buffer;
  /** Names in the zip, in order */
  files: string[];
  /** Pictures left out because the zip reached its cap */
  leftOut: number;
}

/** Upload folders that hold only this person's files (pages/api/media/upload.ts, profile/upload-photo.ts, profile/upload-banner.ts) */
function ownFolders(userId: string): string[] {
  return [`media/${userId}/`, `profile-photos/${userId}/`, `profile-banners/${userId}/`];
}

/** Absolute web addresses in some HTML or CSS, each once, in order. */
export function findUrls(text: string): string[] {
  const found = text.match(/https?:\/\/[^\s"'<>()\\`]+/g) ?? [];
  return [...new Set(found.map((url) => url.replace(/[.,;:!?]+$/, '')))];
}

/**
 * The storage key behind a page address, when it's one of this person's
 * uploads; else null. The query and fragment are left off.
 */
export function ownImageKey(url: string, userId: string, storage: PageDownloadStorage): string | null {
  const bare = url.split(/[?#]/)[0];
  const key = storage.keyFromPublicUrl(bare);
  if (!key) return null;
  // Plain keys only, so the address fetched is exactly the stored object
  if (!/^[A-Za-z0-9._\-/]+$/.test(key) || key.split('/').some((part) => part === '..' || part === '.' || part === '')) {
    return null;
  }
  return ownFolders(userId).some((folder) => key.startsWith(folder)) ? key : null;
}

/** images/<folder>-<file>, kept unique */
function imageName(key: string, taken: Set<string>): string {
  const parts = key.split('/');
  const base = `${parts[0]}-${parts[parts.length - 1]}`.replace(/[^A-Za-z0-9._-]/g, '_');
  let name = `images/${base}`;
  for (let i = 2; taken.has(name); i++) {
    const dot = base.lastIndexOf('.');
    name = dot > 0 ? `images/${base.slice(0, dot)}-${i}${base.slice(dot)}` : `images/${base}-${i}`;
  }
  taken.add(name);
  return name;
}

/** Every occurrence of each address, longest first so one can't eat part of a longer one */
function rewrite(text: string, map: Map<string, string>): string {
  let out = text;
  for (const url of [...map.keys()].sort((a, b) => b.length - a.length)) out = out.split(url).join(map.get(url)!);
  return out;
}

function day(now: Date): string {
  return now.toISOString().slice(0, 10);
}

function indexHtml(
  source: PageDownloadSource,
  template: string,
  hasCss: boolean,
  images: number,
  leftOut: number,
  siteName: string,
  now: Date
): string {
  const lines = [
    `@${source.handle}'s page on ${siteName}, downloaded ${day(now)}.`,
    'This is your page as you wrote it.',
    ...(source.templateMode === 'advanced' ? [] : ["Your page uses the standard layout right now, so this HTML isn't showing there."]),
    ...(hasCss ? ['Your CSS is in style.css.'] : []),
    ...(images > 0 ? ['Pictures it uses that you uploaded are in images/.'] : []),
    ...(leftOut > 0 ? [`${leftOut} more didn't fit in the download, so they still point at their web address.`] : []),
    `Tags like <Guestbook /> are ${siteName} components, so they only work there.`,
  ];
  // "--" would end the comment early
  const comment = lines.map((line) => `  ${line.replace(/--/g, '- -')}`).join('\n');
  return `<!--\n${comment}\n-->\n${template}`;
}

function readme(source: PageDownloadSource, hasCss: boolean, images: number, leftOut: number, siteName: string, now: Date): string {
  const lines = [
    `@${source.handle}'s page on ${siteName}, downloaded ${day(now)}.`,
    '',
    "Your page uses the site's standard layout, so there's no HTML of your own to download.",
    hasCss ? 'style.css is the CSS you added to it.' : "You haven't added any CSS to it yet.",
    ...(images > 0 ? ['images/ has the pictures your CSS uses that you uploaded.'] : []),
    ...(leftOut > 0 ? [`${leftOut} more didn't fit in the download, so they still point at their web address.`] : []),
  ];
  return lines.join('\n') + '\n';
}

/** Reads a picture from the public CDN with a timeout and a size cap. Never throws. */
export const readImageFromCdn: ImageReader = async (url, maxBytes) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal, redirect: 'error' });
    if (!res.ok) return null;
    const contentType = (res.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
    if (!contentType.startsWith('image/')) return null;
    const declared = Number(res.headers.get('content-length'));
    if (Number.isFinite(declared) && declared > maxBytes) return 'too-big';
    const bytes = Buffer.from(await res.arrayBuffer());
    return bytes.length <= maxBytes ? { bytes, contentType } : 'too-big';
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
};

/** The zip for one owner's page. */
export async function buildPageDownload(
  source: PageDownloadSource,
  {
    storage,
    readImage = readImageFromCdn,
    siteName,
    maxBytes = PAGE_DOWNLOAD_MAX_BYTES,
    now = new Date(),
  }: {
    storage: PageDownloadStorage;
    readImage?: ImageReader;
    siteName: string;
    maxBytes?: number;
    now?: Date;
  }
): Promise<PageDownload> {
  const template = source.customTemplate?.trim() ? source.customTemplate : null;
  const css = source.customCSS?.trim() ? source.customCSS : null;

  // This person's pictures that the page uses, each once
  const keys = new Map<string, string>(); // address → key
  for (const url of findUrls(`${template ?? ''}\n${css ?? ''}`)) {
    const key = ownImageKey(url, source.userId, storage);
    if (key) keys.set(url, key);
  }

  // The text files count toward the cap too
  let used = Buffer.byteLength(template ?? '') + Buffer.byteLength(css ?? '') + 4096;
  const images: ZipEntry[] = [];
  const renamed = new Map<string, string>(); // address → images/<file>
  const byKey = new Map<string, string>(); // key → images/<file>, for one picture at two addresses
  const taken = new Set<string>();
  let leftOut = 0;
  for (const [url, key] of keys) {
    const already = byKey.get(key);
    if (already) {
      renamed.set(url, already);
      continue;
    }
    if (images.length >= PAGE_DOWNLOAD_MAX_IMAGES || used >= maxBytes) {
      leftOut++;
      continue;
    }
    const picture = await readImage(storage.publicUrl(key), maxBytes - used);
    if (picture === 'too-big') leftOut++;
    if (!picture || picture === 'too-big') continue;
    const name = imageName(key, taken);
    images.push({ name, data: picture.bytes });
    used += picture.bytes.length;
    renamed.set(url, name);
    byKey.set(key, name);
  }

  const entries: ZipEntry[] = [];
  if (template) {
    entries.push({ name: 'index.html', data: indexHtml(source, rewrite(template, renamed), css !== null, images.length, leftOut, siteName, now) });
  } else {
    entries.push({ name: 'README.txt', data: readme(source, css !== null, images.length, leftOut, siteName, now) });
  }
  if (css) entries.push({ name: 'style.css', data: rewrite(css, renamed) });
  entries.push(...images);

  return { zip: createStoredZip(entries, now), files: entries.map((e) => e.name), leftOut };
}
