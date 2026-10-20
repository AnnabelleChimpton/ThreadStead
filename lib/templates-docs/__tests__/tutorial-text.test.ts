/**
 * Tutorial text goes through autoLinkComponents and the markdown sanitizer
 * (TutorialStep.tsx). A tag written in the text has to come out the other
 * side as written: a bare `<Guestbook />` used to be dropped as HTML.
 */
import { autoLinkComponents } from '@/lib/templates-docs/tutorialLinkProcessor';
import { tutorials } from '@/lib/templates-docs/tutorialContent';
import { markdownToSafeHtml } from '@/lib/utils/sanitization/html';

function rendered(markdown: string): string {
  const div = document.createElement('div');
  div.innerHTML = markdownToSafeHtml(autoLinkComponents(markdown));
  return div.textContent ?? '';
}

/** Tags written in the text, not counting code spans and blocks */
function tagsIn(text: string): string[] {
  const prose = text.replace(/```[\s\S]*?```|`[^`\n]*`/g, '');
  return prose.match(/<\/?[A-Za-z][\w-]*(?:\s[^<>]*)?\/?>/g) ?? [];
}

const texts = tutorials.flatMap((t) =>
  t.steps.flatMap((step) => [step.explanation, ...(step.tips ?? [])].map((text) => [`${t.slug}: ${step.title}`, text]))
);

test.each(texts.filter(([, text]) => tagsIn(text).length > 0))('%s shows every tag it names', (_where, text) => {
  const out = rendered(text);
  for (const tag of tagsIn(text)) expect(out).toContain(tag);
});

test('a component tag links to its reference entry', () => {
  const html = markdownToSafeHtml(autoLinkComponents('<Guestbook /> is the one I would start with.'));
  expect(html).toContain('href="/build/templates/components#guestbook"');
  expect(html).toContain('&lt;Guestbook /&gt;');
});

test('code spans are left as written', () => {
  expect(autoLinkComponents('Write `<Var name="x" />` first.')).toBe('Write `<Var name="x" />` first.');
});
