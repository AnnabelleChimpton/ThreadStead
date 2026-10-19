/**
 * Cloudflare R2 storage — the one place the app talks to the bucket.
 *
 *   const url = await putObject({ key, body, contentType });
 *   await deleteObjects(keys, { context: `media:${id}` });
 *   publicUrl(key);            // where a stored object is served from
 *   keyFromPublicUrl(url);     // the reverse, for deletes
 *
 * Server-only. The S3 client is built once from the typed env
 * (lib/config/env.ts). Object keys are the callers' business and must not
 * change: every stored avatar/media/badge URL is `${publicBase}/${key}`.
 */
import { promises as fs } from 'fs';
import path from 'path';
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getServerEnv } from '@/lib/config/env';

/** Uploads are content-addressed by timestamp/hash, so they never change. */
export const IMMUTABLE_CACHE_CONTROL = 'public, max-age=31536000';

let client: S3Client | null = null;

function getClient(): S3Client {
  if (client) return client;

  const env = getServerEnv();
  // Same check and message the per-route clients used (admin/emojis/upload
  // maps this message to "Server configuration error").
  for (const name of ['R2_PUBLIC_URL', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY'] as const) {
    if (!env[name]) throw new Error(`Missing required environment variable: ${name}`);
  }

  client = new S3Client({
    region: 'auto',
    // Despite its name, R2_PUBLIC_URL is the S3 API endpoint.
    endpoint: env.R2_PUBLIC_URL!,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID!,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
    },
    forcePathStyle: false,
  });
  return client;
}

/** For tests that change env between cases. */
export function resetStorageClient(): void {
  client = null;
}

function bucket(): string {
  return getServerEnv().R2_BUCKET_NAME;
}

/**
 * R2_LOCAL_DIR: in development, a folder under public/ that stands in for the
 * bucket, so a local preview's uploads never reach real storage. Never in
 * production.
 */
function localFolder(): string | null {
  if (process.env.NODE_ENV === 'production') return null;
  const dir = getServerEnv().R2_LOCAL_DIR?.replace(/^\/+|\/+$/g, '');
  return dir && !dir.includes('..') ? dir : null;
}

function localPath(folder: string, key: string): string {
  const file = path.join(process.cwd(), 'public', folder, key);
  if (!file.startsWith(path.join(process.cwd(), 'public', folder) + path.sep)) {
    throw new Error(`Refusing to write outside ${folder}: ${key}`);
  }
  return file;
}

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

/**
 * Candidate public origins, in resolution order: the CDN (server name, then
 * the browser-readable twin), then the S3 endpoint as a last resort.
 */
function publicBases(): string[] {
  const env = getServerEnv();
  const local = localFolder();
  if (local) return [`/${local}`];
  return [env.R2_CDN_URL, env.NEXT_PUBLIC_R2_CDN_URL, env.R2_PUBLIC_URL]
    .filter((v): v is string => !!v)
    .map(stripTrailingSlash);
}

/** Public URL a stored object is served from; '' when nothing is configured. */
export function publicUrl(key: string): string {
  const base = publicBases()[0] ?? '';
  return `${base}/${key}`;
}

/**
 * Bucket key for a URL we produced, or null if it is not under any of our
 * public origins (external URL, or the env changed since it was stored).
 */
export function keyFromPublicUrl(url: string): string | null {
  for (const base of publicBases()) {
    if (url.startsWith(`${base}/`)) {
      // Leading slashes appear if the origin was once configured with a
      // trailing slash (`cdn//media/…`); keys never start with one.
      const key = url.slice(base.length).replace(/^\/+/, '');
      return key || null;
    }
  }
  return null;
}

export interface PutObjectInput {
  key: string;
  body: Buffer;
  contentType: string;
  cacheControl?: string;
}

/** Upload one object and return its public URL. Throws on failure. */
export async function putObject({
  key,
  body,
  contentType,
  cacheControl = IMMUTABLE_CACHE_CONTROL,
}: PutObjectInput): Promise<string> {
  const local = localFolder();
  if (local) {
    const file = localPath(local, key);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, body);
    return publicUrl(key);
  }
  await getClient().send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: cacheControl,
    })
  );
  return publicUrl(key);
}

export interface DeleteObjectsResult {
  deleted: string[];
  failed: string[];
}

/**
 * Delete objects one by one. Never throws: a failed delete leaves an orphaned
 * object, which shouldn't block removing the database row, so each failure is
 * logged with `context` and returned in `failed` for the caller to act on.
 */
export async function deleteObjects(
  keys: string[],
  { context = 'storage' }: { context?: string } = {}
): Promise<DeleteObjectsResult> {
  const result: DeleteObjectsResult = { deleted: [], failed: [] };
  if (keys.length === 0) return result;

  const local = localFolder();
  if (local) {
    for (const key of keys) {
      await fs.rm(localPath(local, key), { force: true }).then(
        () => result.deleted.push(key),
        () => result.failed.push(key)
      );
    }
    return result;
  }

  let s3: S3Client;
  try {
    s3 = getClient();
  } catch (err) {
    console.error(`[${context}] Cannot delete ${keys.length} R2 object(s):`, err);
    return { deleted: [], failed: [...keys] };
  }

  for (const key of keys) {
    try {
      await s3.send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
      result.deleted.push(key);
    } catch (err) {
      result.failed.push(key);
      console.error(`[${context}] Failed to delete ${key} from R2:`, err);
    }
  }
  if (result.failed.length > 0) {
    console.error(
      `[${context}] ${result.failed.length}/${keys.length} R2 objects orphaned: ${result.failed.join(', ')}`
    );
  }
  return result;
}
