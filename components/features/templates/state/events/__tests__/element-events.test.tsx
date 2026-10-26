/**
 * OnClick and the mouse events on any element (element-events.tsx): what
 * they give the element and take back, and where they won't attach. The
 * whole page, compiled and hydrated, is in
 * tests/template-engine/__tests__/click-anything.test.tsx.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react';

jest.mock('@/lib/templates/state/TemplateStateProvider', () => ({ useTemplateState: () => ({}) }));
jest.mock('@/components/features/templates/ResidentDataProvider', () => ({ useResidentData: () => ({}) }));
jest.mock('../../loops/ForEach', () => ({ useForEachContext: () => null }));
jest.mock('@/lib/templates/state/ActionExecutor', () => ({ executeActions: jest.fn() }));

import OnClick from '../OnClick';
import OnMouseEnter from '../OnMouseEnter';
import { executeActions } from '@/lib/templates/state/ActionExecutor';

const island = (child: React.ReactNode) => React.createElement('ts-island', null, child);
const ran = executeActions as jest.Mock;

beforeEach(() => ran.mockClear());

test('an element that isn\'t a button or link becomes one; one that is keeps its own; all of it goes on unmount', () => {
  const { container, unmount } = render(
    <div data-template-root="">
      <div id="card">{island(<OnClick>{null}</OnClick>)}card</div>
      <a id="link" href="/x">{island(<OnClick>{null}</OnClick>)}link</a>
      <div id="own" tabIndex={-1} role="link">{island(<OnClick>{null}</OnClick>)}own</div>
    </div>
  );
  const $ = (id: string) => container.querySelector<HTMLElement>(`#${id}`)!;
  expect([$('card').getAttribute('tabindex'), $('card').getAttribute('role'), $('card').hasAttribute('data-ts-clickable')]).toEqual(['0', 'button', true]);
  expect([$('link').hasAttribute('tabindex'), $('link').hasAttribute('role'), $('link').hasAttribute('data-ts-clickable')]).toEqual([false, false, true]);
  expect([$('own').getAttribute('tabindex'), $('own').getAttribute('role')]).toEqual(['-1', 'link']);

  fireEvent.click($('card'));
  expect(ran).toHaveBeenCalledTimes(1);
  expect(ran.mock.calls[0][4]).toBe($('card'));

  const card = $('card');
  const own = $('own');
  unmount();
  // React leaves the element as it was; what OnClick added is gone
  expect([card.hasAttribute('tabindex'), card.hasAttribute('role'), card.hasAttribute('data-ts-clickable')]).toEqual([false, false, false]);
  expect([own.getAttribute('tabindex'), own.getAttribute('role'), own.hasAttribute('data-ts-clickable')]).toEqual(['-1', 'link', false]);
});

test('Enter and Space press it (Space without scrolling); not a key typed in a field inside, nor a held key', () => {
  const { container } = render(
    <div data-template-root="">
      <div id="card">{island(<OnClick>{null}</OnClick>)}<input id="field" /></div>
    </div>
  );
  const card = container.querySelector<HTMLElement>('#card')!;
  expect(fireEvent.keyDown(card, { key: 'Enter' })).toBe(true);
  expect(fireEvent.keyDown(card, { key: ' ' })).toBe(false); // default prevented
  expect(ran).toHaveBeenCalledTimes(2);
  fireEvent.keyDown(card, { key: 'a' });
  fireEvent.keyDown(card, { key: 'Enter', repeat: true });
  fireEvent.keyDown(container.querySelector('#field')!, { key: ' ' });
  fireEvent.click(container.querySelector('#field')!);
  expect(ran).toHaveBeenCalledTimes(2);
});

test('two OnClicks on one element share what it was given until the last one goes', () => {
  const Page = ({ both }: { both: boolean }) => (
    <div data-template-root="">
      <div id="card">
        {island(<OnClick>{null}</OnClick>)}
        {both && island(<OnClick>{null}</OnClick>)}
      </div>
    </div>
  );
  const { container, rerender } = render(<Page both />);
  const card = container.querySelector<HTMLElement>('#card')!;
  fireEvent.click(card);
  expect(ran).toHaveBeenCalledTimes(2);
  rerender(<Page both={false} />);
  expect(card.getAttribute('role')).toBe('button');
  fireEvent.click(card);
  expect(ran).toHaveBeenCalledTimes(3);
});

test('nothing attaches to the page root, or outside the page', () => {
  const { container } = render(
    <>
      <div data-template-root="" id="root">{island(<OnClick>{null}</OnClick>)}</div>
      <nav id="site">{island(<OnClick>{null}</OnClick>)}site</nav>
    </>
  );
  for (const id of ['root', 'site']) {
    const element = container.querySelector<HTMLElement>(`#${id}`)!;
    expect(element.hasAttribute('data-ts-clickable')).toBe(false);
    fireEvent.click(element);
  }
  expect(ran).not.toHaveBeenCalled();
});

test('a target outside the page, or that isn\'t a selector, does nothing', () => {
  const { container } = render(
    <>
      <div data-template-root="">
        <p>{island(<OnClick target="#site">{null}</OnClick>)}</p>
        <p>{island(<OnClick target="[[nope">{null}</OnClick>)}</p>
      </div>
      <nav id="site">site</nav>
    </>
  );
  fireEvent.click(container.querySelector('#site')!);
  expect(container.querySelector('#site')!.hasAttribute('role')).toBe(false);
  expect(ran).not.toHaveBeenCalled();
});

test('OnMouseEnter in any element runs with that element', () => {
  const { container } = render(
    <div data-template-root="">
      <section id="shop">{island(<OnMouseEnter>{null}</OnMouseEnter>)}shop</section>
    </div>
  );
  const shop = container.querySelector<HTMLElement>('#shop')!;
  expect(shop.hasAttribute('tabindex')).toBe(false);
  fireEvent.mouseEnter(shop);
  expect(ran).toHaveBeenCalledTimes(1);
  expect(ran.mock.calls[0][4]).toBe(shop);
});
