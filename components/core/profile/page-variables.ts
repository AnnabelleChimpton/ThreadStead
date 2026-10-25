import { useEffect } from 'react';

/** Where _app.tsx and the editor's preview put a page's own CSS */
const PAGE_CSS_ID = 'advanced-template-css';

const round = (n: number) => Math.round(n * 1000) / 1000;

/**
 * What the page root tells a page's CSS and inline styles, set by our code,
 * never the page's:
 *  - `--hour`, `--minute`, `--weekday` (0 is Sunday), `--month` (1–12): the
 *    visitor's clock, at the turn of each minute
 *  - `--seed`: 0 to 1, new on each visit
 *  - `--pointer-x`, `--pointer-y`: 0 to 1 across the window, at most once a
 *    frame, and only on a page that uses them (each change restyles the
 *    whole page). They stay at 0.5 on touch screens and for anyone who asked
 *    for less motion.
 * Unset at first paint, as the server can't know the visitor's clock: a page
 * writes var(--hour, 12).
 */
export function usePageVariables(rootId: string, page: unknown) {
  useEffect(() => {
    const root = document.getElementById(rootId);
    if (!root) return;
    const set = (name: string, value: number) => root.style.setProperty(name, String(value));

    set('--seed', round(Math.random()));
    const clock = () => {
      const now = new Date();
      set('--hour', now.getHours());
      set('--minute', now.getMinutes());
      set('--weekday', now.getDay());
      set('--month', now.getMonth() + 1);
    };
    let tick: ReturnType<typeof setTimeout>;
    const nextMinute = () => {
      clock();
      tick = setTimeout(nextMinute, 60_000 - (Date.now() % 60_000));
    };
    nextMinute();

    // The pointer, for a page whose CSS or HTML mentions it (checked again
    // when its CSS changes, as it does in the editor's preview)
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce), (hover: none)');
    const css = document.getElementById(PAGE_CSS_ID);
    let frame = 0;
    let x = 0.5;
    let y = 0.5;
    const draw = () => {
      frame = 0;
      set('--pointer-x', round(x));
      set('--pointer-y', round(y));
    };
    const move = (event: PointerEvent) => {
      x = event.clientX / window.innerWidth;
      y = event.clientY / window.innerHeight;
      frame ||= requestAnimationFrame(draw);
    };
    let following = false;
    const follow = () => {
      const wanted = !still?.matches && [css?.textContent, root.innerHTML].some((text) => text?.includes('--pointer-'));
      if (wanted === following) return;
      following = wanted;
      if (wanted) {
        window.addEventListener('pointermove', move, { passive: true });
      } else {
        window.removeEventListener('pointermove', move);
        x = y = 0.5;
        draw();
      }
    };
    draw();
    follow();
    const watcher = new MutationObserver(follow);
    if (css) watcher.observe(css, { childList: true, characterData: true, subtree: true });
    still?.addEventListener('change', follow);

    return () => {
      clearTimeout(tick);
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', move);
      watcher.disconnect();
      still?.removeEventListener('change', follow);
    };
  }, [rootId, page]);
}
