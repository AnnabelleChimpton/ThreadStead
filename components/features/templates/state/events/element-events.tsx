'use client';

/**
 * OnClick, OnMouseEnter, OnMouseLeave and OnSwipe on any element of a page,
 * not only inside a Button (template audit 06 §8). The event
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
import { TEMPLATE_ROOT, pageElements, pageRoots, pageSelector } from '../actions/page-targets';

export type ElementEvent = 'click' | 'enter' | 'leave';

/** What a browser already clicks and reaches with Tab: it keeps its own keyboard and role */
const INTERACTIVE = 'a[href], area[href], button, input, select, textarea, summary, label, [contenteditable]:not([contenteditable="false"])';
/** Elements whose own role matters more than "button" */
const KEEPS_ITS_ROLE = 'h1, h2, h3, h4, h5, h6, li, dt, dd, dl, ol, ul, td, th, tr, table, pre, blockquote, figure, nav, main, header, footer, article, aside, section, form';
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
  // A heading, list item, cell or the like keeps what it is to a screen
  // reader: role=button made a clickable <h1> stop being a heading (bug
  // bash 2026-10-26). It's still reached with Tab and pressed with Enter.
  const meaningful = element.matches(KEEPS_ITS_ROLE);
  const added = { count: 1, tabindex: !native && !element.hasAttribute('tabindex'), role: !native && !meaningful && !element.hasAttribute('role') };
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

/**
 * A clickable that had focus and goes away when pressed (an If hiding it,
 * "close") left focus nowhere, on the page's body, and the next Tab
 * started from the top (bug bash 2026-10-26). Focus goes to the nearest
 * part of the page still there: what's around it, or the page itself.
 */
function keepFocusNear(element: HTMLElement): () => void {
  if (!element.contains(document.activeElement)) return () => {};
  const around: HTMLElement[] = [];
  for (let up = element.parentElement; up; up = up.parentElement) around.push(up);
  return () => {
    setTimeout(() => {
      if (element.isConnected || (document.activeElement && document.activeElement !== document.body)) return;
      const near = around.find((candidate) => candidate.isConnected && (candidate.matches(CLICKABLE) || candidate.tabIndex >= 0 || candidate.id === 'main-content'))
        ?? around.find((candidate) => candidate.isConnected && candidate.matches(TEMPLATE_ROOT));
      if (!near) return;
      if (!near.hasAttribute('tabindex') && !near.matches(CLICKABLE)) near.setAttribute('tabindex', '-1');
      near.focus({ preventScroll: true });
    }, 50);
  };
}

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
  const full = pageSelector(selector);
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
    const go = (element: HTMLElement) => {
      const settle = keepFocusNear(element);
      runRef.current(element);
      settle();
    };
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

export type SwipeDirection = 'left' | 'right' | 'up' | 'down';

/**
 * What a swiped element lets the browser still do with a finger, by how
 * many swipes want each axis: one that only swipes left and right still
 * scrolls the page up and down (pan-y). Taken back with the last swipe.
 */
const swipeAxes = new WeakMap<HTMLElement, { x: number; y: number; before: string }>();

function axesOf(direction: SwipeDirection | undefined) {
  return { x: direction !== 'up' && direction !== 'down' ? 1 : 0, y: direction !== 'left' && direction !== 'right' ? 1 : 0 };
}

function holdAxes(element: HTMLElement, direction: SwipeDirection | undefined, by: 1 | -1) {
  let record = swipeAxes.get(element);
  if (!record) {
    if (by < 0) return;
    record = { x: 0, y: 0, before: element.style.touchAction };
    swipeAxes.set(element, record);
  }
  const { x, y } = axesOf(direction);
  record.x += x * by;
  record.y += y * by;
  if (record.x <= 0 && record.y <= 0) {
    element.style.touchAction = record.before;
    swipeAxes.delete(element);
    return;
  }
  element.style.touchAction = record.x > 0 && record.y > 0 ? 'none' : record.x > 0 ? 'pan-y' : 'pan-x';
}

/** Long enough for a flick, not a slow drag across the page */
const SWIPE_MS = 1000;

/**
 * Runs `run` with the element when someone swipes across it: a finger, a
 * pen, or the mouse held down and dragged, at least `distance` pixels,
 * mostly one way. No direction: any way. The element it sits in, or with
 * `target` the page's elements matching it. A swipe isn't a click too.
 */
export function useSwipe(direction: SwipeDirection | undefined, target: string | undefined, distance: number, run: (element: HTMLElement) => void) {
  const markerRef = useRef<HTMLSpanElement>(null);
  const runRef = useRef(run);
  useEffect(() => {
    runRef.current = run;
  });

  useEffect(() => {
    const selector = target?.trim();
    const matches = selector ? matchSelector(selector) : null;
    const own = selector ? null : elementAround(markerRef.current);
    if (selector ? !matches : !own) return;
    /** The element a pointer went down on that this swipe is for */
    const swiped = (node: EventTarget | null): HTMLElement | null => {
      if (own) return isElement(node) && own.contains(node) ? own : null;
      const element = isElement(node) ? node.closest<HTMLElement>(matches!) : null;
      const root = element?.closest(TEMPLATE_ROOT);
      return element && root && root !== element ? element : null;
    };

    let start: { id: number; x: number; y: number; at: number; element: HTMLElement } | null = null;
    const onDown = (e: PointerEvent) => {
      if (!e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;
      const element = swiped(e.target);
      if (element) start = { id: e.pointerId, x: e.clientX, y: e.clientY, at: e.timeStamp, element };
    };
    const onUp = (e: PointerEvent) => {
      if (!start || e.pointerId !== start.id) return;
      const { x, y, at, element } = start;
      start = null;
      const dx = e.clientX - x;
      const dy = e.clientY - y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < distance || e.timeStamp - at > SWIPE_MS) return;
      const way: SwipeDirection = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
      if (direction && way !== direction) return;
      // The click a mouse drag ends in is the swipe's, not an OnClick's
      const swallow = (click: MouseEvent) => {
        click.stopPropagation();
        click.preventDefault();
      };
      element.addEventListener('click', swallow, { capture: true, once: true });
      setTimeout(() => element.removeEventListener('click', swallow, { capture: true }), 0);
      runRef.current(element);
    };
    // The browser took the touch over (scrolling, zooming): no swipe
    const onCancel = (e: PointerEvent) => {
      if (start && e.pointerId === start.id) start = null;
    };
    // A mouse drag that starts on a picture or link is the swipe's: the
    // browser began dragging the picture instead, and the swipe never came
    // (bug bash 2026-10-26)
    const onDragStart = (e: DragEvent) => {
      if (start && swiped(e.target)) e.preventDefault();
    };

    const listenOn: EventTarget = own ?? document;
    listenOn.addEventListener('pointerdown', onDown as EventListener);
    listenOn.addEventListener('dragstart', onDragStart as EventListener);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);

    // Swiping across it doesn't scroll the page that way, for the
    // elements there now and any the page shows later
    const held = new Set<HTMLElement>();
    const update = () => {
      const now = new Set(own ? [own] : pageElements(selector!).filter((element) => !element.matches(TEMPLATE_ROOT)));
      for (const element of held) {
        if (!now.has(element)) {
          held.delete(element);
          holdAxes(element, direction, -1);
        }
      }
      for (const element of now) {
        if (!held.has(element)) {
          held.add(element);
          holdAxes(element, direction, 1);
        }
      }
    };
    update();
    const observer = own ? null : new MutationObserver(update);
    if (observer) for (const root of pageRoots()) observer.observe(root, { childList: true, subtree: true });

    return () => {
      observer?.disconnect();
      listenOn.removeEventListener('pointerdown', onDown as EventListener);
      listenOn.removeEventListener('dragstart', onDragStart as EventListener);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
      for (const element of held) holdAxes(element, direction, -1);
    };
  }, [direction, target, distance]);

  return markerRef;
}
