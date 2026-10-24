/**
 * A page's actions reach only its own elements (security audit C1/M1,
 * design/template-audit/04-security.md). Selectors used to run against the
 * whole document, so a page could restyle or rewrite the site's own nav.
 */
import { isSafePageAttribute, pageElements } from '../page-targets';
import { executeAddClassAction } from '../AddClass';
import { executeConditionalAttrAction } from '../ConditionalAttr';
import { executeSetCSSVarAction } from '../SetCSSVar';

beforeEach(() => {
  document.body.innerHTML = `
    <nav id="site-nav"><a class="link" href="/">Home</a></nav>
    <div data-template-root><p id="user-content-hello" class="link">Hi</p></div>
    <section data-template-root><span class="link">Slot</span></section>`;
});

it('finds only elements inside the page, and #id also finds the sanitized #user-content-id', () => {
  expect(pageElements('.link').map((el) => el.textContent)).toEqual(['Hi', 'Slot']);
  expect(pageElements('#site-nav')).toEqual([]);
  expect(pageElements('nav a')).toEqual([]);
  expect(pageElements('#hello').map((el) => el.textContent)).toEqual(['Hi']);
  expect(pageElements('[[not a selector')).toEqual([]);
});

it('leaves the site alone when a page targets it', () => {
  executeAddClassAction({ target: 'nav, .link', className: 'gone' });
  expect(document.querySelector('#site-nav')!.className).toBe('');
  expect(document.querySelector('nav a')!.className).toBe('link');
  expect(pageElements('.gone')).toHaveLength(2);
});

it('sets only state and accessibility attributes', () => {
  for (const name of ['aria-expanded', 'data-mood', 'hidden', 'open', 'title']) expect(isSafePageAttribute(name)).toBe(true);
  for (const name of ['onclick', 'href', 'src', 'style', 'srcdoc', 'action', 'formaction', 'class']) expect(isSafePageAttribute(name)).toBe(false);

  const hello = document.querySelector('#user-content-hello')!;
  executeConditionalAttrAction({ element: '#hello', attribute: 'href', value: 'x', when: '1 === 1' }, {});
  expect(hello.hasAttribute('href')).toBe(false);
  executeConditionalAttrAction({ element: '#hello', attribute: 'aria-expanded', value: 'true', when: '1 === 1' }, {});
  expect(hello.getAttribute('aria-expanded')).toBe('true');
});

it('sets :root variables on the page, never the whole site', () => {
  executeSetCSSVarAction({ name: '--accent', value: 'pink' }, {} as any);
  executeSetCSSVarAction({ name: 'color', value: 'red' }, {} as any);
  expect(document.documentElement.style.getPropertyValue('--accent')).toBe('');
  const roots = Array.from(document.querySelectorAll<HTMLElement>('[data-template-root]'));
  expect(roots.map((el) => el.style.getPropertyValue('--accent'))).toEqual(['pink', 'pink']);
  expect(roots[0].style.color).toBe('');
});

it("never sets a worked-out value that loads a file", () => {
  const root = document.querySelector<HTMLElement>('[data-template-root]')!;
  executeSetCSSVarAction({ name: '--bg', expression: '"url(https://elsewhere.example/p.png)"' }, {} as any);
  executeSetCSSVarAction({ name: '--set', expression: '"image-set(\\"a.png\\" 1x)"' }, {} as any);
  expect(root.style.getPropertyValue('--bg')).toBe('');
  expect(root.style.getPropertyValue('--set')).toBe('');
  // Written out in the page, it's the same as the page's own CSS
  executeSetCSSVarAction({ name: '--bg', value: 'url(cat.png)' }, {} as any);
  expect(root.style.getPropertyValue('--bg')).toBe('url(cat.png)');
  executeSetCSSVarAction({ name: '--size', expression: '2 * 8 + "px"' }, {} as any);
  expect(root.style.getPropertyValue('--size')).toBe('16px');
});
