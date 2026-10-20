/**
 * What `<Embed src="…">` can play, and the player address for it.
 *
 * Five hosts, chosen by the owner (2026-10-19): YouTube (through
 * youtube-nocookie.com only), Vimeo, Bandcamp, SoundCloud and Spotify.
 * People paste what they have: the page link from the address bar, the
 * host's own player link, or (for Bandcamp, whose page links don't carry
 * the album id) the whole `<iframe>` embed code.
 *
 * The player address is always rebuilt from parts read out of the link and
 * checked one by one (an 11-character video id, a numeric album id…), never
 * the pasted string passed through. Anything else, including every other
 * host, http:, a lookalike domain, a user:pass@ prefix or a port, gives null.
 *
 * Pure and browser-safe: the component, the template parser's warnings and
 * the source rewrite for pasted embed code (source-scan.ts) all use it.
 * next.config.ts lets exactly EMBED_HOSTS' origins into frame-src
 * (pinned by lib/templates/__tests__/embeds.test.ts).
 */

export type EmbedHost = 'youtube' | 'vimeo' | 'bandcamp' | 'soundcloud' | 'spotify';

export interface EmbedHostInfo {
  /** The host's name, for people */
  label: string;
  /** Where its player lives: the one origin the iframe ever loads */
  origin: string;
  /**
   * The iframe's sandbox. Every player runs its own scripts and keeps its own
   * storage (allow-scripts allow-same-origin), and links out to its own site
   * in a new tab, which should open as a normal page (allow-popups
   * allow-popups-to-escape-sandbox). Video players also cast to a TV
   * (allow-presentation). Never allow-top-navigation: a player can't move
   * the visitor off the page.
   */
  sandbox: string;
  /** Permissions the player is given. Autoplay is how one click both loads and starts it. */
  allow?: string;
}

const AUDIO_SANDBOX = 'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox';
const VIDEO_SANDBOX = `${AUDIO_SANDBOX} allow-presentation`;

export const EMBED_HOSTS: Readonly<Record<EmbedHost, EmbedHostInfo>> = {
  youtube: {
    label: 'YouTube',
    origin: 'https://www.youtube-nocookie.com',
    sandbox: VIDEO_SANDBOX,
    allow: 'autoplay; encrypted-media; fullscreen; picture-in-picture',
  },
  vimeo: {
    label: 'Vimeo',
    origin: 'https://player.vimeo.com',
    sandbox: VIDEO_SANDBOX,
    allow: 'autoplay; fullscreen; picture-in-picture',
  },
  // Bandcamp's player has no autoplay switch and asks for nothing
  bandcamp: { label: 'Bandcamp', origin: 'https://bandcamp.com', sandbox: AUDIO_SANDBOX },
  soundcloud: { label: 'SoundCloud', origin: 'https://w.soundcloud.com', sandbox: AUDIO_SANDBOX, allow: 'autoplay' },
  // Full tracks are for visitors signed in to Spotify: those are DRM'd
  // (encrypted-media), and where the browser blocks third-party cookies the
  // player has to ask for its sign-in, which a sandboxed frame can only do
  // with allow-storage-access-by-user-activation (on a click, like Play).
  spotify: {
    label: 'Spotify',
    origin: 'https://open.spotify.com',
    sandbox: `${AUDIO_SANDBOX} allow-storage-access-by-user-activation`,
    allow: 'autoplay; encrypted-media',
  },
};

export interface EmbedPlayer {
  host: EmbedHost;
  /** The host's name, for people: "YouTube" */
  label: string;
  /** The player's address, rebuilt from the parts read out of src */
  playerUrl: string;
  /** What the iframe loads after the click: playerUrl, asking it to start playing where the host can */
  playUrl: string;
  /** Player height in px. null for video, which keeps a 16:9 shape at any width. */
  height: number | null;
  /** The widest the player looks right, in px (Bandcamp's big-artwork player is a 350px column) */
  maxWidth?: number;
}

/** Heights a pasted embed code or the height setting can ask for */
export const EMBED_MIN_HEIGHT = 40;
export const EMBED_MAX_HEIGHT = 1200;

const MAX_SRC_LENGTH = 4000;

/** The hosts, in words: "YouTube, Vimeo, Bandcamp, SoundCloud and Spotify" */
export const EMBED_HOST_LIST = (() => {
  const labels = Object.values(EMBED_HOSTS).map((host) => host.label);
  return `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
})();

/**
 * The player for `src`, or null when it isn't a link to something one of
 * the five hosts can play.
 */
export function embedFor(src: unknown): EmbedPlayer | null {
  if (typeof src !== 'string') return null;
  let text = src.trim();
  if (!text || text.length > MAX_SRC_LENGTH) return null;

  let pastedHeight: number | undefined;
  if (/^<iframe[\s>]/i.test(text)) {
    const code = parseEmbedCode(text);
    if (!code) return null;
    text = code.src;
    pastedHeight = code.height;
  }

  const url = httpsUrl(text);
  if (!url) return null;
  const player = playerFor(url);
  if (!player) return null;
  // A pasted code's height is the one the host picked for that player; videos keep 16:9
  if (pastedHeight !== undefined && player.height !== null) player.height = pastedHeight;
  return player;
}

/**
 * Why `src` isn't playable, in a sentence for the page's owner (the
 * component's note and the editor's warning). Undefined when it is.
 */
export function whyNoEmbed(src: unknown): string | undefined {
  if (embedFor(src)) return undefined;
  const text = typeof src === 'string' ? src.trim() : '';
  if (!text) return 'Embed needs a link in src, like src="https://youtu.be/…".';
  const url = /^https?:\/\//i.test(text) ? safeUrl(text) : null;
  if (url && /(^|\.)bandcamp\.com$/.test(url.hostname)) {
    return "For Bandcamp, use the link in Bandcamp's embed code (Share, then Embed). Its page links don't say which album to play.";
  }
  return `Embed can't play that link. It takes links from ${EMBED_HOST_LIST}.`;
}

// ---- pasted embed code ----------------------------------------------------

/**
 * The src (and height, when it says one) of a pasted `<iframe …>` embed
 * code. Only reads it: the src still goes through embedFor's checks.
 */
export function parseEmbedCode(code: string): { src: string; height?: number } | null {
  const tag = code.trim().match(/^<iframe\b([^>]*)>/i);
  if (!tag) return null;
  const attrs = tag[1];
  const attr = (name: string): string | undefined => {
    const m = attrs.match(new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'>]+))`, 'i'));
    return m ? decodeHtmlEntities(m[1] ?? m[2] ?? m[3] ?? '') : undefined;
  };
  const src = attr('src');
  if (!src) return null;
  const heightAttr = attr('height')?.trim();
  const fromStyle = attr('style')?.match(/(?:^|;)\s*height\s*:\s*(\d+)px/i)?.[1];
  const raw = heightAttr && /^\d+(px)?$/i.test(heightAttr) ? parseInt(heightAttr, 10) : fromStyle ? parseInt(fromStyle, 10) : undefined;
  return raw === undefined ? { src } : { src, height: clampHeight(raw) };
}

/** The few entities an attribute in embed code uses */
export function decodeHtmlEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|amp|quot|apos|lt|gt);/gi, (whole, entity: string) => {
    const lower = entity.toLowerCase();
    if (lower === 'amp') return '&';
    if (lower === 'quot') return '"';
    if (lower === 'apos') return "'";
    if (lower === 'lt') return '<';
    if (lower === 'gt') return '>';
    const code = lower.startsWith('#x') ? parseInt(lower.slice(2), 16) : parseInt(lower.slice(1), 10);
    return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole;
  });
}

export function clampHeight(px: number): number {
  return Math.min(EMBED_MAX_HEIGHT, Math.max(EMBED_MIN_HEIGHT, Math.round(px)));
}

// ---- URLs -------------------------------------------------------------------

function safeUrl(text: string): URL | null {
  try {
    return new URL(text);
  } catch {
    return null;
  }
}

/**
 * An absolute https: URL with nothing unusual about where it points: no
 * user:pass@, no port, no backslashes or whitespace for a parser to read
 * differently. Protocol-relative (//host) and every other scheme fail.
 */
function httpsUrl(text: string): URL | null {
  if (!/^https:\/\/[^/\\]/i.test(text)) return null;
  if (/[\s\\\u0000-\u001f\u007f]/.test(text)) return null;
  const url = safeUrl(text);
  if (!url || url.protocol !== 'https:' || url.username || url.password || url.port) return null;
  return url;
}

function segmentsOf(url: URL): string[] {
  return url.pathname.split('/').filter(Boolean);
}

function playerFor(url: URL): EmbedPlayer | null {
  const host = url.hostname;
  if (YOUTUBE_HOSTS.has(host)) return youtube(url);
  if (VIMEO_HOSTS.has(host)) return vimeo(url);
  if (host === 'bandcamp.com') return bandcamp(url);
  if (SOUNDCLOUD_PAGE_HOSTS.has(host) || host === 'w.soundcloud.com') return soundcloud(url);
  if (host === 'open.spotify.com') return spotify(url);
  return null;
}

function make(host: EmbedHost, playerUrl: URL, height: number | null, autoplay?: [string, string], maxWidth?: number): EmbedPlayer {
  const play = new URL(playerUrl.href);
  if (autoplay) play.searchParams.set(autoplay[0], autoplay[1]);
  return {
    host,
    label: EMBED_HOSTS[host].label,
    playerUrl: playerUrl.href,
    playUrl: play.href,
    height,
    ...(maxWidth ? { maxWidth } : {}),
  };
}

// ---- YouTube --------------------------------------------------------------

const YOUTUBE_HOSTS = new Set([
  'youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'youtube-nocookie.com', 'www.youtube-nocookie.com',
]);
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_LIST = /^[A-Za-z0-9_-]{2,64}$/;

/** A start time: 90, 90s, 1m30s, 1h2m3s */
function seconds(value: string | null): number {
  if (!value) return 0;
  const m = value.trim().match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/i);
  if (!m) return 0;
  const total = (parseInt(m[1] || '0', 10) * 60 + parseInt(m[2] || '0', 10)) * 60 + parseInt(m[3] || '0', 10);
  return total > 0 && total < 100000 ? total : 0;
}

function youtube(url: URL): EmbedPlayer | null {
  const parts = segmentsOf(url);
  const params = url.searchParams;
  let id: string | undefined;
  let list: string | undefined;

  if (url.hostname === 'youtu.be') {
    if (parts.length === 1) id = parts[0];
  } else if (parts.length === 1 && parts[0] === 'watch') {
    id = params.get('v') ?? undefined;
  } else if (parts.length === 1 && parts[0] === 'playlist') {
    list = params.get('list') ?? undefined;
  } else if (parts.length === 2 && parts[0] === 'embed' && parts[1] === 'videoseries') {
    list = params.get('list') ?? undefined;
  } else if (parts.length === 2 && ['embed', 'shorts', 'live'].includes(parts[0])) {
    id = parts[1];
  }
  // Only the embed path lives on youtube-nocookie.com
  if (url.hostname.endsWith('youtube-nocookie.com') && parts[0] !== 'embed') return null;

  const player = new URL(EMBED_HOSTS.youtube.origin);
  if (id !== undefined) {
    if (!YOUTUBE_ID.test(id)) return null;
    player.pathname = `/embed/${id}`;
    const start = seconds(params.get('t') ?? params.get('start'));
    if (start) player.searchParams.set('start', String(start));
  } else if (list !== undefined) {
    if (!YOUTUBE_LIST.test(list)) return null;
    player.pathname = '/embed/videoseries';
    player.searchParams.set('list', list);
  } else {
    return null;
  }
  return make('youtube', player, null, ['autoplay', '1']);
}

// ---- Vimeo ----------------------------------------------------------------

const VIMEO_HOSTS = new Set(['vimeo.com', 'www.vimeo.com', 'player.vimeo.com']);
const VIMEO_ID = /^\d{1,12}$/;
/** The private-link hash of an unlisted video */
const VIMEO_HASH = /^[0-9a-f]{6,20}$/i;

function vimeo(url: URL): EmbedPlayer | null {
  const parts = segmentsOf(url);
  let id: string | undefined;
  let hash: string | undefined;

  if (url.hostname === 'player.vimeo.com') {
    if (parts.length === 2 && parts[0] === 'video') {
      id = parts[1];
      hash = url.searchParams.get('h') ?? undefined;
    }
  } else if (parts.length === 1 || (parts.length === 2 && VIMEO_ID.test(parts[0]))) {
    // vimeo.com/ID, vimeo.com/ID/HASH (unlisted)
    [id, hash] = parts;
  } else if (parts.length === 3 && parts[0] === 'channels') {
    id = parts[2];
  } else if (parts.length === 4 && parts[0] === 'groups' && parts[2] === 'videos') {
    id = parts[3];
  }
  if (!id || !VIMEO_ID.test(id)) return null;
  if (hash !== undefined && !VIMEO_HASH.test(hash)) return null;

  const player = new URL(EMBED_HOSTS.vimeo.origin);
  player.pathname = `/video/${id}`;
  if (hash) player.searchParams.set('h', hash);
  // Vimeo's "do not track": no session cookies or play stats tied to the visitor
  player.searchParams.set('dnt', '1');
  return make('vimeo', player, null, ['autoplay', '1']);
}

// ---- Bandcamp -------------------------------------------------------------

/** EmbeddedPlayer settings worth keeping, in the order they're written back, with the values each takes */
const BANDCAMP_SETTINGS: ReadonlyArray<[string, RegExp]> = [
  ['album', /^\d{1,15}$/],
  ['track', /^\d{1,15}$/],
  ['size', /^(large|small)$/],
  ['bgcol', /^[0-9a-f]{6}$/i],
  ['linkcol', /^[0-9a-f]{6}$/i],
  ['tracklist', /^(true|false)$/],
  ['artwork', /^(big|small|none)$/],
  ['minimal', /^true$/],
  ['transparent', /^true$/],
];

function bandcamp(url: URL): EmbedPlayer | null {
  const [first, ...rest] = segmentsOf(url);
  if (first?.toLowerCase() !== 'embeddedplayer') return null;
  const given = new Map<string, string>();
  for (const part of rest) {
    const eq = part.indexOf('=');
    if (eq > 0) given.set(part.slice(0, eq).toLowerCase(), part.slice(eq + 1));
  }
  const kept: string[] = [];
  const setting = new Map<string, string>();
  for (const [key, pattern] of BANDCAMP_SETTINGS) {
    const value = given.get(key);
    if (value === undefined) continue;
    // A malformed id is a broken link, not something to drop quietly
    if (!pattern.test(value)) {
      if (key === 'album' || key === 'track') return null;
      continue;
    }
    kept.push(`${key}=${value}`);
    setting.set(key, value);
  }
  if (!setting.has('album') && !setting.has('track')) return null;

  // The heights Bandcamp's own embed builder gives each layout. With a
  // track list the real height depends on the album; a pasted embed code
  // (or the height setting) says it exactly.
  const showsTracklist = setting.has('album') && setting.get('tracklist') !== 'false';
  let height: number;
  let maxWidth: number | undefined;
  if (setting.get('minimal') === 'true') {
    height = 350;
    maxWidth = 350;
  } else if (setting.get('size') === 'small') {
    height = 42;
  } else if (setting.get('artwork') === 'small' || setting.get('artwork') === 'none') {
    height = showsTracklist ? 300 : 120;
  } else {
    // Big artwork: the art is as wide as the player, so it stays a 350px column
    height = showsTracklist ? 600 : 470;
    maxWidth = 350;
  }

  const player = new URL(EMBED_HOSTS.bandcamp.origin);
  player.pathname = `/EmbeddedPlayer/${kept.join('/')}/`;
  return make('bandcamp', player, height, undefined, maxWidth);
}

// ---- SoundCloud -----------------------------------------------------------

const SOUNDCLOUD_PAGE_HOSTS = new Set(['soundcloud.com', 'www.soundcloud.com', 'm.soundcloud.com']);
const SOUNDCLOUD_SLUG = /^[A-Za-z0-9_-]{1,100}$/;
/** Parts of soundcloud.com that aren't someone's sounds */
const SOUNDCLOUD_NOT_SOUNDS = new Set([
  'discover', 'search', 'stream', 'feed', 'you', 'upload', 'charts', 'settings', 'messages', 'notifications',
  'signin', 'signup', 'pages', 'terms-of-use', 'imprint', 'jobs', 'mobile', 'pro', 'artists',
]);
const SOUNDCLOUD_API = /^https:\/\/api\.soundcloud\.com\/(tracks|playlists|users)\/((?:soundcloud:(?:tracks|playlists|users):)?\d{1,15})$/;

function soundcloud(url: URL): EmbedPlayer | null {
  let source: string;
  let kind: 'track' | 'list';
  let visual = false;
  let color: string | undefined;

  if (url.hostname === 'w.soundcloud.com') {
    const parts = segmentsOf(url);
    if (parts.length !== 1 || parts[0] !== 'player') return null;
    const inner = url.searchParams.get('url')?.trim() ?? '';
    const api = inner.match(SOUNDCLOUD_API);
    if (api) {
      source = `https://api.soundcloud.com/${api[1]}/${api[2]}`;
      kind = api[1] === 'tracks' ? 'track' : 'list';
    } else {
      const innerUrl = httpsUrl(inner);
      if (!innerUrl || !SOUNDCLOUD_PAGE_HOSTS.has(innerUrl.hostname)) return null;
      const page = soundcloudPage(innerUrl);
      if (!page) return null;
      ({ source, kind } = page);
    }
    visual = url.searchParams.get('visual') === 'true';
    const c = url.searchParams.get('color')?.match(/^#?([0-9a-f]{6})$/i);
    if (c) color = `#${c[1].toLowerCase()}`;
  } else {
    const page = soundcloudPage(url);
    if (!page) return null;
    ({ source, kind } = page);
  }

  const player = new URL(`${EMBED_HOSTS.soundcloud.origin}/player/`);
  player.searchParams.set('url', source);
  if (color) player.searchParams.set('color', color);
  if (visual) player.searchParams.set('visual', 'true');
  // SoundCloud's own sizes: 166 for one track; 300 and 450 for the big-artwork and list players
  const height = kind === 'list' ? 450 : visual ? 300 : 166;
  return make('soundcloud', player, height, ['auto_play', 'true']);
}

/** soundcloud.com/artist, /artist/track, /artist/sets/list, plus a private link's s-token */
function soundcloudPage(url: URL): { source: string; kind: 'track' | 'list' } | null {
  const parts = segmentsOf(url);
  if (parts.length < 1 || parts.length > 4 || !parts.every((part) => SOUNDCLOUD_SLUG.test(part))) return null;
  if (SOUNDCLOUD_NOT_SOUNDS.has(parts[0].toLowerCase())) return null;
  const kind = parts.length === 1 || parts[1] === 'sets' ? 'list' : 'track';
  return { source: `https://soundcloud.com/${parts.join('/')}`, kind };
}

// ---- Spotify --------------------------------------------------------------

const SPOTIFY_TYPES = new Set(['track', 'album', 'playlist', 'episode', 'show']);
const SPOTIFY_ID = /^[A-Za-z0-9]{22}$/;

function spotify(url: URL): EmbedPlayer | null {
  let parts = segmentsOf(url);
  // open.spotify.com/intl-de/track/…, and the player's own /embed/track/…
  if (parts[0] && /^intl-[a-z]{2}(-[a-z]{2})?$/i.test(parts[0])) parts = parts.slice(1);
  if (parts[0] === 'embed') parts = parts.slice(1);
  if (parts.length !== 2) return null;
  const [type, id] = parts;
  if (!SPOTIFY_TYPES.has(type) || !SPOTIFY_ID.test(id)) return null;

  const player = new URL(EMBED_HOSTS.spotify.origin);
  player.pathname = `/embed/${type}/${id}`;
  // Spotify's own sizes: the compact player for a song, the full one for lists and shows
  const height = type === 'track' ? 152 : type === 'episode' ? 232 : 352;
  return make('spotify', player, height);
}
