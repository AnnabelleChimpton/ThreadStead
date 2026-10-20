/**
 * "Start from this page" opens the editor on someone else's page. That isn't
 * what's saved, so the editor must open unsaved: it warns before you leave
 * and keeps a crash draft, instead of saying "Saved" until you type.
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import EnhancedTemplateEditor from '../EnhancedTemplateEditor';
import { ToastProvider } from '@/contexts/ToastContext';

jest.mock('next/dynamic', () => () => {
  const FakeDynamic = (props: { value: string; placeholder?: string; onChange?: (value: string) => void }) =>
    typeof props.onChange === 'function' ? (
      <textarea aria-label="code" value={props.value} onChange={(e) => props.onChange?.(e.target.value)} />
    ) : null;
  return FakeDynamic;
});

const user = { id: 'u-start', primaryHandle: 'pat@local', handles: [], profile: {} };

beforeEach(() => {
  global.fetch = jest.fn(async () => ({ ok: true, status: 200, json: async () => ({}) })) as unknown as typeof fetch;
  window.localStorage.clear();
});

function open(props: Partial<React.ComponentProps<typeof EnhancedTemplateEditor>>) {
  return render(
    <ToastProvider>
      <EnhancedTemplateEditor
        user={user}
        initialTemplate="<!-- Started from @sam's page -->\n<main>Sam's page</main>"
        initialCSS="main { color: plum; }"
        initialTemplateMode="advanced"
        initialEditorMode="template"
        onSave={jest.fn()}
        {...props}
      />
    </ToastProvider>
  );
}

test('a started-from page opens unsaved', async () => {
  open({ startsUnsaved: true, savedCSS: 'body { color: teal; }' });
  await waitFor(() => expect(screen.getByText('Unsaved')).toBeInTheDocument());
  expect(screen.queryByText('Saved')).toBeNull();
});

test('your own page opens saved', async () => {
  open({});
  await waitFor(() => expect(screen.getByText('Saved')).toBeInTheDocument());
});
