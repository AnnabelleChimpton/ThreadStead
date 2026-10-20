/**
 * The starter pages in the HTML editor's gallery, simplest first. Each is one
 * page as you'd write it: <meta> colour and font options, a <style> block
 * (the gallery moves it to the CSS tab) and the HTML. Written for site
 * styles off, with their own spacing. Plain page is also what a new HTML page
 * opens with.
 *
 * Thumbnails: public/starters/<id>.png, a screenshot of each starter on a
 * filled-in page; take a new one when a starter changes.
 */
import { PLAIN_PAGE } from './plain-page';
import { NOTEBOOK_HOMEPAGE } from './notebook-homepage';
import { OLD_WEB } from './old-web';
import { SCRAPBOOK } from './scrapbook';
import { NIGHT_WINDOW } from './night-window';

export interface Starter {
  id: string;
  name: string;
  description: string;
  template: string;
}

export const STARTERS: Starter[] = [
  {
    id: 'plain-page',
    name: 'Plain page',
    description: 'About me, what I\'m up to, my links, a guestbook. Good one to learn from.',
    template: PLAIN_PAGE,
  },
  {
    id: 'notebook-homepage',
    name: 'Notebook homepage',
    description: 'A homepage with a sidebar: my friends, my rings, my house, my posts.',
    template: NOTEBOOK_HOMEPAGE,
  },
  {
    id: 'old-web',
    name: 'Old web',
    description: 'Stars, a scrolling message and a webring. Like 1999, minus the blinking.',
    template: OLD_WEB,
  },
  {
    id: 'scrapbook',
    name: 'Scrapbook',
    description: 'Graph paper and stuck-on cards. Posts in the middle, guestbook at the bottom.',
    template: SCRAPBOOK,
  },
  {
    id: 'night-window',
    name: 'Night Window',
    description: 'A lamp visitors can switch on and off. Shows how buttons that remember things work.',
    template: NIGHT_WINDOW,
  },
];

/** A starter as the gallery loads it: <style> to the CSS tab, the rest to the HTML tab */
export function splitStarter(template: string): { html: string; css: string } {
  const style = template.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  return {
    css: style ? style[1].trim() + '\n' : '',
    html: template.replace(/<style[^>]*>[\s\S]*?<\/style>\s*/i, '').trim(),
  };
}
