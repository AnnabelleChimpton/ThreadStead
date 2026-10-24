/**
 * The compiler reports stripped tags by category. Pasting a whole Neocities
 * page used to show "5 Components Stripped" and a "Save Anyway" button for
 * nothing more than <html>, <head> and <body>.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ValidationFeedbackPanel, { hasStrippedNeedingAttention, type StrippedEntry } from '../ValidationFeedbackPanel';

jest.mock('@/components/ui/PixelIcon', () => ({ PixelIcon: () => null }));

const wrappers: StrippedEntry[] = [
  { name: 'html', line: 2, category: 'document', reason: 'Document wrapper (expected): only what’s inside <body> becomes your page.' },
  { name: 'head', line: 3, category: 'document', reason: 'Document wrapper (expected): only what’s inside <body> becomes your page.' },
  { name: 'meta', line: 4, category: 'document', count: 1, reason: 'Document wrapper (expected): only what’s inside <body> becomes your page.' },
  { name: 'title', line: 5, category: 'document', reason: 'Document wrapper (expected): the title isn’t shown on the page itself.' },
  { name: 'body', line: 8, category: 'document', reason: 'Document wrapper (expected): only what’s inside <body> becomes your page.' },
];

function renderPanel(strippedComponents: StrippedEntry[], warnings: string[] = []) {
  const onSaveAnyway = jest.fn();
  render(
    <ValidationFeedbackPanel
      validationResult={{ isValid: true, errors: [], warnings, strippedComponents }}
      onDismiss={() => {}}
      onSaveAnyway={onSaveAnyway}
    />
  );
  return { onSaveAnyway };
}

describe('hasStrippedNeedingAttention', () => {
  it('ignores document wrappers', () => {
    expect(hasStrippedNeedingAttention(wrappers)).toBe(false);
    expect(hasStrippedNeedingAttention([])).toBe(false);
    expect(hasStrippedNeedingAttention(undefined)).toBe(false);
  });

  it('flags anything else, including entries from before categories existed', () => {
    expect(hasStrippedNeedingAttention([...wrappers, { name: 'script', category: 'safety' }])).toBe(true);
    expect(hasStrippedNeedingAttention([{ name: 'marquee' }])).toBe(true);
  });
});

describe('ValidationFeedbackPanel stripped report', () => {
  it('treats a whole pasted document as valid, with the wrappers tucked away', () => {
    renderPanel(wrappers);

    expect(screen.queryByText(/Components? Stripped/i)).toBeNull();
    expect(screen.getByText('Nothing in the way: it can save.')).toBeInTheDocument();
    // 5 entries, <meta> twice
    expect(screen.getByText('Document wrappers (expected) (6)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save Anyway' })).toBeNull();

    // Collapsed by default; opening it shows each tag without repeating the group label
    expect(screen.queryByText('<html>')).toBeNull();
    fireEvent.click(screen.getByText('Document wrappers (expected) (6)'));
    expect(screen.getByText('<html>')).toBeInTheDocument();
    expect(screen.getByText('2 times')).toBeInTheDocument();
    expect(screen.getByText('First on line 4')).toBeInTheDocument();
    expect(screen.getByText('The title isn’t shown on the page itself.')).toBeInTheDocument();
    expect(screen.queryByText(/^Document wrapper \(expected\):/)).toBeNull();
  });

  it('groups the rest under their own headings and still offers Save Anyway', () => {
    renderPanel([
      ...wrappers,
      { name: 'marquee', line: 20, category: 'unsupported', count: 2, reason: 'Not supported here: this tag isn’t one pages can use, so its contents were kept without it.' },
      { name: 'script', line: 30, category: 'safety', reason: 'Removed for safety: scripts don’t run on pages here.' },
      { name: 'Guestbok', line: 12, category: 'unsupported', reason: 'There’s no component called <Guestbok>. Did you mean <Guestbook>?' },
    ]);

    expect(screen.queryByText('Template is valid!')).toBeNull();
    expect(screen.getByText('4 tags not supported here')).toBeInTheDocument();
    expect(screen.getByText('1 tag removed for safety')).toBeInTheDocument();
    expect(screen.getByText('Not supported here (4)')).toBeInTheDocument();
    expect(screen.getByText('Removed for safety (1)')).toBeInTheDocument();

    // Problem groups start open
    expect(screen.getByText('<marquee>')).toBeInTheDocument();
    expect(screen.getByText('3 times')).toBeInTheDocument();
    expect(screen.getByText('This tag isn’t one pages can use, so its contents were kept without it.')).toBeInTheDocument();
    expect(screen.getByText('Scripts don’t run on pages here.')).toBeInTheDocument();
    expect(screen.getByText('There’s no component called <Guestbok>. Did you mean <Guestbook>?')).toBeInTheDocument();

    expect(screen.getByRole('button', { name: 'Save Anyway' })).toBeInTheDocument();
  });
});

describe('ValidationFeedbackPanel component prop warnings', () => {
  const propWarning =
    'Line 3: <StickyNote color="teal"> color can be yellow, pink, blue, green, orange or purple. Using yellow.';

  it('shows the tag as written, its line, and what happened', () => {
    renderPanel([], [propWarning, 'Template is getting large']);

    expect(screen.getByText("2 things won't work as written")).toBeInTheDocument();
    expect(screen.getByText('<StickyNote color="teal">')).toBeInTheDocument();
    expect(screen.getByText('Line 3')).toBeInTheDocument();
    expect(screen.getByText('color can be yellow, pink, blue, green, orange or purple. Using yellow.')).toBeInTheDocument();
    // Warnings without a line show as they are
    expect(screen.getByText('Template is getting large')).toBeInTheDocument();
    // A warning doesn't stop the save
    expect(screen.getByRole('button', { name: 'Save Anyway' })).toBeInTheDocument();
  });
});
