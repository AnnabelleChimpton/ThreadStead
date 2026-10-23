/**
 * The two outside lookups for Bluesky handles, both to fixed hosts (nothing
 * a resident types decides where a request goes):
 *
 *   - public.api.bsky.app: who the account is, from the handle or DID the
 *     resident pastes into Settings
 *   - plc.directory: the DID document, whose first at:// alias is the
 *     account's handle. Only the account owner can change it, so it saying
 *     alice.homepageagain.com is the proof the link is theirs.
 *
 * did:plc only for now. did:web accounts would mean fetching their host.
 */

export const BSKY_PUBLIC_API = 'https://public.api.bsky.app';
export const PLC_DIRECTORY = 'https://plc.directory';
const TIMEOUT_MS = 5000;

const DID_PLC_RE = /^did:plc:[a-z2-7]{24}$/;
// atproto handle syntax: dot-separated DNS labels, the last one not all digits
const HANDLE_RE = /^(?=.{3,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export type Fetcher = (url: string, init?: RequestInit) => Promise<Response>;

export const defaultFetcher: Fetcher = (url, init) =>
  fetch(url, {
    ...init,
    headers: { Accept: 'application/json', ...(init?.headers ?? {}) },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

export type BlueskyInput =
  | { kind: 'did'; did: string }
  | { kind: 'handle'; handle: string }
  | { kind: 'invalid'; message: string };

/**
 * What a resident pasted: a handle (@alice.bsky.social), a DID
 * (did:plc:…), or a bsky.app profile link to either.
 */
export function parseBlueskyInput(raw: unknown): BlueskyInput {
  if (typeof raw !== 'string' || !raw.trim()) {
    return { kind: 'invalid', message: 'Paste your Bluesky handle, like @you.bsky.social' };
  }
  let value = raw.trim();
  const profileLink = value.match(/^(?:https?:\/\/)?(?:www\.)?bsky\.app\/profile\/([^/?#\s]+)/i);
  if (profileLink) value = decodeURIComponent(profileLink[1]);
  value = value.replace(/^at:\/\//i, '').replace(/^@/, '').trim();

  if (/^did:/i.test(value)) {
    const did = value.toLowerCase();
    if (did.startsWith('did:web:')) {
      return { kind: 'invalid', message: "Accounts with a did:web identity can't be linked yet, only did:plc ones" };
    }
    if (!DID_PLC_RE.test(did)) return { kind: 'invalid', message: "That doesn't look like a Bluesky DID" };
    return { kind: 'did', did };
  }
  const handle = value.toLowerCase();
  if (!HANDLE_RE.test(handle)) {
    return { kind: 'invalid', message: "That doesn't look like a Bluesky handle, like @you.bsky.social" };
  }
  return { kind: 'handle', handle };
}

export interface BlueskyAccount {
  did: string;
  handle: string;
  displayName: string | null;
  avatar: string | null;
}

export class BlueskyLookupError extends Error {
  constructor(
    message: string,
    /** 404: no such account; 400: an account we can't link; 502: Bluesky didn't answer */
    readonly status: 400 | 404 | 502
  ) {
    super(message);
    this.name = 'BlueskyLookupError';
  }
}

/** The Bluesky account a handle or DID belongs to (app.bsky.actor.getProfile). */
export async function lookupBlueskyAccount(
  input: Exclude<BlueskyInput, { kind: 'invalid' }>,
  fetcher: Fetcher = defaultFetcher
): Promise<BlueskyAccount> {
  const actor = input.kind === 'did' ? input.did : input.handle;
  let response: Response;
  try {
    response = await fetcher(`${BSKY_PUBLIC_API}/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(actor)}`);
  } catch {
    throw new BlueskyLookupError("Bluesky didn't answer just now. Try again in a minute?", 502);
  }
  if (response.status === 400 || response.status === 404) {
    throw new BlueskyLookupError(`I couldn't find a Bluesky account for ${input.kind === 'did' ? actor : `@${actor}`}`, 404);
  }
  if (!response.ok) throw new BlueskyLookupError("Bluesky didn't answer just now. Try again in a minute?", 502);

  const body = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  const did = typeof body?.did === 'string' ? body.did.toLowerCase() : '';
  if (!did) throw new BlueskyLookupError("Bluesky didn't answer just now. Try again in a minute?", 502);
  if (!DID_PLC_RE.test(did)) {
    throw new BlueskyLookupError("That account has a did:web identity, and only did:plc ones can be linked for now", 400);
  }
  return {
    did,
    handle: typeof body?.handle === 'string' ? body.handle.toLowerCase() : '',
    displayName: typeof body?.displayName === 'string' && body.displayName.trim() ? body.displayName.trim() : null,
    avatar: typeof body?.avatar === 'string' && body.avatar.startsWith('https://') ? body.avatar : null,
  };
}

export type PlcHandleResult = { ok: true; handle: string | null } | { ok: false };

/**
 * The handle a DID's document claims right now (its first at:// alias), from
 * plc.directory. `ok: false` when the directory couldn't be read: say so,
 * don't treat it as the handle having changed.
 */
export async function plcHandle(did: string, fetcher: Fetcher = defaultFetcher): Promise<PlcHandleResult> {
  if (!DID_PLC_RE.test(did)) return { ok: false };
  let response: Response;
  try {
    response = await fetcher(`${PLC_DIRECTORY}/${did}`);
  } catch {
    return { ok: false };
  }
  if (!response.ok) return { ok: false };
  const doc = (await response.json().catch(() => null)) as { alsoKnownAs?: unknown } | null;
  if (!doc) return { ok: false };
  const aliases = Array.isArray(doc.alsoKnownAs) ? doc.alsoKnownAs : [];
  const first = aliases.find((alias): alias is string => typeof alias === 'string' && alias.startsWith('at://'));
  return { ok: true, handle: first ? first.slice('at://'.length).toLowerCase() : null };
}
