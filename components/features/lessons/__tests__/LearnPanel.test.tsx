/**
 * The Learn panel folds to one line, to give the code room, and stays
 * folded next time. Check my work from the folded line opens it to say how
 * it went.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import LearnPanel from '../LearnPanel';

const panel = () => (
  <LearnPanel slug="little-surprises" step={1} onStep={jest.fn()} page={null} onShowMe={jest.fn()} onClose={jest.fn()} />
);

beforeEach(() => window.localStorage.clear());

test('folds to one line and stays folded', () => {
  const { unmount } = render(panel());
  fireEvent.click(screen.getByRole('button', { name: 'Fold' }));
  expect(screen.getByText(/Step 1 of \d+:/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Open' })).toHaveAttribute('aria-expanded', 'false');
  unmount();

  render(panel());
  expect(screen.getByRole('button', { name: 'Open' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Open' }));
  expect(screen.getByRole('button', { name: 'Fold' })).toBeInTheDocument();
});

test('Check my work on the folded line opens it with the answer', () => {
  render(panel());
  fireEvent.click(screen.getByRole('button', { name: 'Fold' }));
  fireEvent.click(screen.getByRole('button', { name: 'Check my work' }));
  expect(screen.getByRole('button', { name: 'Fold' })).toBeInTheDocument();
  expect(screen.getByRole('status')).toBeInTheDocument();
});
