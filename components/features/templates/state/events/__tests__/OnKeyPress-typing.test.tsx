/**
 * OnKeyPress listens on the whole document, so a letter key went off while
 * a visitor typed in the guestbook box, the site's search or chat
 * (template audit, Rafa R23). Not while typing; anywhere else it still runs.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react';

jest.mock('@/lib/templates/state/TemplateStateProvider', () => ({ useTemplateState: () => ({}) }));
jest.mock('@/components/features/templates/ResidentDataProvider', () => ({ useResidentData: () => ({}) }));
jest.mock('../../loops/ForEach', () => ({ useForEachContext: () => null }));
jest.mock('../OnClick', () => ({ executeActions: jest.fn() }));

import OnKeyPress from '../OnKeyPress';
import { executeActions } from '../OnClick';

test('a key typed into a text box, textarea or editable area is the visitor typing, not the page key', () => {
  render(
    <>
      <OnKeyPress keyName="g">{null}</OnKeyPress>
      <input aria-label="name" />
      <textarea aria-label="message" />
      <div contentEditable aria-label="note" />
    </>
  );
  for (const label of ['name', 'message', 'note']) {
    fireEvent.keyDown(document.querySelector(`[aria-label="${label}"]`)!, { key: 'g' });
  }
  expect(executeActions).not.toHaveBeenCalled();
  fireEvent.keyDown(document.body, { key: 'g' });
  expect(executeActions).toHaveBeenCalledTimes(1);
});
