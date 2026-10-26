/**
 * Text the server render writes into an element (a <style>'s CSS) that the
 * page data (__NEXT_DATA__) doesn't carry a second copy of: getServerSideProps
 * (or _app) puts it under a symbol key, which JSON leaves out, and the
 * browser reads it back from the element the server wrote. A page's CSS went
 * to the browser twice, in its <style> and raw in the page data (194 KB for a
 * big pasted page), and the site's CSS three times.
 *
 * A client-side navigation gets its props as JSON, symbol keys and all left
 * out, so getServerSideProps sends the text as an ordinary prop then
 * (isDataRequest). Read back once, a value is kept per key: Back to the first
 * page can hand it its original props again, by when the element shows
 * another page's text.
 *
 * One symbol per id, not one holder for them all: Next merges _app's
 * pageProps with getServerSideProps' with Object.assign, which copies symbol
 * keys too, so a shared holder from the page replaced _app's and the site's
 * CSS server-rendered as its placeholder on every page of someone's own HTML.
 */
const keyFor = (id: string) => Symbol.for(`threadstead.serverOnly:${id}`);

type WithServerOnly = Record<symbol, string | undefined>;

/** Put `text` on `props` for the server render only */
export function putServerOnly(props: object, id: string, text: string): void {
  (props as WithServerOnly)[keyFor(id)] = text;
}

const readBack = new Map<string, string>();

/**
 * The text for the element with this id: on the server, what was put on the
 * props; in the browser, what the server wrote into the element. `key` tells
 * pages apart (the page's owner), so a value read back stays that page's.
 */
export function readServerOnly(props: object, id: string, key = '', read: 'text' | 'html' = 'text'): string | undefined {
  const fromServer = (props as WithServerOnly)[keyFor(id)];
  if (fromServer !== undefined) return fromServer;
  if (typeof document === 'undefined') return undefined;
  const cacheKey = `${id}\u0000${key}`;
  if (!readBack.has(cacheKey)) {
    const element = document.getElementById(id);
    const text = read === 'html' ? element?.innerHTML : element?.textContent;
    if (text == null) return undefined;
    readBack.set(cacheKey, text);
  }
  return readBack.get(cacheKey);
}

/** A client-side navigation's request for a page's props, which arrive as JSON */
export function isDataRequest(req: { headers: Record<string, string | string[] | undefined>; url?: string }): boolean {
  return req.headers['x-nextjs-data'] === '1' || !!req.url?.startsWith('/_next/data/');
}
