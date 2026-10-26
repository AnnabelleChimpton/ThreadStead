'use client';

/**
 * OnClick, OnHover, OnMouseEnter and OnMouseLeave on any element of a page,
 * not only inside a Button or EventDiv (template audit 06 §8). The event
 * renders a hidden marker; once the page has hydrated, it finds the element
 * it sits in (the parent of its <ts-island>) and listens there. With
 * target="…" it listens from the document instead, for the page's elements
 * matching the selector, so one that shows up later (an <If> turning true)
 * works too.
 *
 * Something clicked this way is a button for keyboards and screen readers:
 * Tab reaches it, Enter and Space press it. Only ever inside the page
 * ([data-template-root]), never the page root or the site around it.
 */
import React, { useEffect, useRef } from 'react';
import { TEMPLATE_ROOT, pageElements, pageRoots } from '../actions/page-targets';

export type ElementEvent = 'click' | 'enter' | 'leave';

/** What a browser already clicks and reaches with Tab: it keeps its own keyboard and role */
const INTERACTIVE = 'a[href], area[href], button, input, select, textarea, summary, label, [contenteditable]:not([contenteditable="false"])';
/** Something a click inside an element is for instead: the innermost one runs */
const CLICKABLE = `${INTERACTIVE}, [data-ts-clickable]`;

/**
 * What each clickable element was given, and by how many events: two
 * OnClicks on one element share it, and the last one to go takes back
 * only what was added.
 */
const given = new WeakMap<HTMLElement, { count: number; tabindex: boolean; role: boolean }>();

function makeClickable(element: HTMLElement) {
  const record = given.get(element);
  if (record) {
    record.count++;
    return;
  }
  const native = element.matches(INTERACTIVE);
  const added = { count: 1, tabindex: !native && !element.hasAttribute('tabindex'), role: !native && !element.hasAttribute('role') };
  if (added.tabindex) element.setAttribute('tabindex', '0');
  if (added.role) element.setAttribute('role', 'button');
  // cursor: pointer (styles/page-defaults.css)
  element.setAttribute('data-ts-clickable', '');
  given.set(element, added);
}

function unmakeClickable(element: HTMLElement) {
  const record = given.get(element);
  if (!record || --record.count > 0) return;
  given.delete(element);
  if (record.tabindex) element.removeAttribute('tabindex');
  if (record.role) element.removeAttribute('role');
  element.removeAttribute('data-ts-clickable');
}

const isElement = (node: EventTarget | null): node is Element => !!node && typeof (node as Element).closest === 'function';

/** Whether a click on `node` is for `element`, not for a button, link, field or clickable inside it */
function clickIsFor(element: HTMLElement, node: EventTarget | null): boolean {
  const inner = isElement(node) ? node.closest(CLICKABLE) : null;
  return !inner || inner === element || !element.contains(inner);
}

/** Enter or Space on an element that isn't a button or link of its own */
function isPress(event: KeyboardEvent, element: HTMLElement): boolean {
  return event.target === element && !event.repeat && (event.key === 'Enter' || event.key === ' ') && !element.matches(INTERACTIVE);
}

/** The element an event's marker sits in: past any components' <ts-island>s, inside the page and not its root */
export function elementAround(marker: Element | null): HTMLElement | null {
  let element = marker?.parentElement ?? null;
  while (element && element.localName === 'ts-island') element = element.parentElement;
  const root = element?.closest(TEMPLATE_ROOT);
  return element && root && root !== element ? element : null;
}

/**
 * A selector for closest() that finds what pageElements finds: an #id also
 * matches the sanitizer's #user-content-id. Null when it isn't a selector.
 */
function matchSelector(selector: string): string | null {
  const full = selector.startsWith('#') && !selector.startsWith('#user-content-')
    ? `${selector}, #user-content-${selector.slice(1)}`
    : selector;
  try {
    document.createDocumentFragment().querySelector(full);
    return full;
  } catch {
    return null;
  }
}

/**
 * Runs `run` with the element when the event happens on it: the element
 * the returned marker sits in, or with `target` the page's elements
 * matching it. Render the marker with eventMarker().
 */
export function useElementEvent(event: ElementEvent, target: string | undefined, run: (element: HTMLElement) => void) {
  const markerRef = useRef<HTMLSpanElement>(null);
  // The latest actions and state, without listening again on every render
  const runRef = useRef(run);
  useEffect(() => {
    runRef.current = run;
  });

  useEffect(() => {
    const go = (element: HTMLElement) => runRef.current(element);
    const selector = target?.trim();

    if (!selector) {
      const element = elementAround(markerRef.current);
      if (!element) return;
      if (event === 'enter' || event === 'leave') {
        const type = event === 'enter' ? 'mouseenter' : 'mouseleave';
        const listener = () => go(element);
        element.addEventListener(type, listener);
        return () => element.removeEventListener(type, listener);
      }
      const onClick = (e: MouseEvent) => {
        if (clickIsFor(element, e.target)) go(element);
      };
      const onKeyDown = (e: KeyboardEvent) => {
        if (!isPress(e, element)) return;
        if (e.key === ' ') e.preventDefault(); // not the page scrolling
        go(element);
      };
      makeClickable(element);
      element.addEventListener('click', onClick);
      element.addEventListener('keydown', onKeyDown);
      return () => {
        element.removeEventListener('click', onClick);
        element.removeEventListener('keydown', onKeyDown);
        unmakeClickable(element);
      };
    }

    const matches = matchSelector(selector);
    if (!matches) return;
    /** The page element matching the selector that `node` is in */
    const hit = (node: EventTarget | null): HTMLElement | null => {
      const element = isElement(node) ? node.closest<HTMLElement>(matches) : null;
      const root = element?.closest(TEMPLATE_ROOT);
      return element && root && root !== element ? element : null;
    };

    if (event === 'enter' || event === 'leave') {
      // mouseenter and mouseleave don't bubble: their bubbling twins, minus
      // moves between an element's own children
      const type = event === 'enter' ? 'mouseover' : 'mouseout';
      const listener = (e: Event) => {
        const element = hit(e.target);
        const other = (e as MouseEvent).relatedTarget;
        if (element && !(isElement(other) && element.contains(other))) go(element);
      };
      document.addEventListener(type, listener);
      return () => document.removeEventListener(type, listener);
    }

    const onClick = (e: MouseEvent) => {
      const element = hit(e.target);
      if (element && clickIsFor(element, e.target)) go(element);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      const element = hit(e.target);
      if (!element || !isPress(e, element)) return;
      if (e.key === ' ') e.preventDefault();
      go(element);
    };
    // Matching elements reachable by keyboard, those there now and any the
    // page shows later
    const clickable = new Set<HTMLElement>();
    const update = () => {
      const now = new Set(pageElements(selector).filter((element) => !element.matches(TEMPLATE_ROOT)));
      for (const element of clickable) {
        if (!now.has(element)) {
          clickable.delete(element);
          unmakeClickable(element);
        }
      }
      for (const element of now) {
        if (!clickable.has(element)) {
          clickable.add(element);
          makeClickable(element);
        }
      }
    };
    update();
    const observer = new MutationObserver(update);
    for (const root of pageRoots()) observer.observe(root, { childList: true, subtree: true });
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      observer.disconnect();
      document.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKeyDown);
      for (const element of clickable) unmakeClickable(element);
    };
  }, [event, target]);

  return markerRef;
}

/** Where an event sits on the page: nothing to see, the same on the server and in the browser */
export function eventMarker(ref: React.RefObject<HTMLSpanElement | null>) {
  return <span ref={ref} hidden data-ts-event="" style={{ display: 'none' }} />;
}
