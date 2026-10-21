import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

const push = jest.fn();
jest.mock('next/router', () => ({ useRouter: () => ({ push }) }));
jest.mock('@/contexts/GlobalAudioContext', () => ({
  useGlobalAudio: () => ({ welcome: null }),
}));
jest.mock('@/components/ui/PixelIcon', () => ({
  PixelIcon: ({ name }: { name: string }) => <span data-testid={`pixel-icon-${name}`} />,
}));

import SignupFinaleAnimation, {
  ARRIVAL_TIMEOUT_MS,
  FINALE_MS,
  LANDED_MS,
  arrivalSentence,
} from '../SignupFinaleAnimation';

const house = (number: number, username: string) => ({
  userId: `u${number}`,
  username,
  displayName: null,
  number,
  snapshotCardUrl: null,
  houseTemplate: 'cottage_v1',
  palette: 'thread_sage',
  houseCustomizations: {},
  decorationCount: 0,
});

const ARRIVAL = {
  number: 38,
  street: { index: 1, name: 'Oak Avenue' },
  homes: [house(36, 'fern'), house(37, 'moss'), house(38, 'newbie')],
};
const SENTENCE = 'You live at 38 Oak Avenue now.';

function respondWith(body: unknown, ok = true) {
  global.fetch = jest.fn().mockResolvedValue({ ok, json: async () => body }) as jest.Mock;
}

function setReducedMotion(reduce: boolean) {
  window.matchMedia = jest.fn().mockImplementation((query: string) => ({
    matches: reduce && query.includes('reduce'),
    media: query,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  })) as unknown as typeof window.matchMedia;
}

/** Everything the status region ever said, to catch half-typed text */
function recordStatus(): string[] {
  const said: string[] = [];
  const status = screen.getByRole('status');
  const observer = new MutationObserver(() => said.push(status.textContent ?? ''));
  observer.observe(status, { childList: true, subtree: true, characterData: true });
  return said;
}

async function openFinale() {
  const utils = render(<SignupFinaleAnimation username="newbie" />);
  // Let the street's fetch settle
  await act(async () => {});
  return utils;
}

let page: HTMLDivElement;

beforeEach(() => {
  jest.useFakeTimers();
  push.mockClear();
  setReducedMotion(false);
  respondWith(ARRIVAL);
  page = document.createElement('div');
  page.id = '__next';
  document.body.appendChild(page);
});

afterEach(() => {
  jest.useRealTimers();
  page.remove();
});

describe('SignupFinaleAnimation', () => {
  it('opens with Skip focused, and Skip goes home once', async () => {
    await openFinale();
    const skip = screen.getByRole('button', { name: 'Skip' });
    expect(skip).toHaveFocus();

    fireEvent.click(skip);
    fireEvent.click(skip);
    act(() => { jest.advanceTimersByTime(FINALE_MS); });
    expect(push).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith('/?welcome=1');
  });

  it('Escape skips too', async () => {
    await openFinale();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(push).toHaveBeenCalledWith('/?welcome=1');
  });

  it('sets the house down into its own lot, between its neighbours, then goes home', async () => {
    await openFinale();
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    const lots = document.querySelectorAll('.ts-street-lot');
    expect([...lots].map((lot) => lot.id)).toEqual(['lot-fern', 'lot-moss', 'lot-newbie']);
    expect(document.getElementById('lot-newbie')).toHaveClass('ts-street-lot--arriving');
    expect(document.getElementById('lot-moss')).not.toHaveClass('ts-street-lot--arriving');

    act(() => { jest.advanceTimersByTime(FINALE_MS - 1); });
    expect(push).not.toHaveBeenCalled();
    act(() => { jest.advanceTimersByTime(1); });
    expect(push).toHaveBeenCalledWith('/?welcome=1');
  });

  it('announces one finished sentence once the house is in, never partial text', async () => {
    await openFinale();
    const said = recordStatus();
    expect(screen.getByRole('status')).toHaveTextContent('');

    act(() => { jest.advanceTimersByTime(LANDED_MS - 1); });
    expect(screen.getByRole('status')).toHaveTextContent('');
    act(() => { jest.advanceTimersByTime(1); });
    await act(async () => {});

    expect(screen.getByRole('status')).toHaveTextContent(SENTENCE);
    expect(said.filter((text) => text !== '')).toEqual([SENTENCE]);
    expect(arrivalSentence(ARRIVAL)).toBe(SENTENCE);
  });

  it('under reduced motion, opens on the final frame', async () => {
    setReducedMotion(true);
    await openFinale();
    await act(async () => { jest.advanceTimersByTime(0); });

    expect(document.querySelector('.ts-street-lot--arriving')).toBeNull();
    expect(document.getElementById('lot-newbie')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(SENTENCE);
    expect(screen.getByRole('status').querySelector('.ts-finale-caption')).toBeNull();
    expect(screen.getByRole('button', { name: 'Skip' })).toHaveFocus();
  });

  it('makes the page behind inert while it is up', async () => {
    const { unmount } = await openFinale();
    expect(page).toHaveAttribute('inert');
    expect(page).not.toContainElement(screen.getByRole('dialog'));
    unmount();
    expect(page).not.toHaveAttribute('inert');
  });

  it('makes no sound of its own: no beep, no AudioContext', async () => {
    const made = jest.fn();
    (window as unknown as { AudioContext: unknown }).AudioContext = function AudioContext() { made(); };
    const play = jest.spyOn(window.HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    await openFinale();
    act(() => { jest.advanceTimersByTime(FINALE_MS); });
    expect(made).not.toHaveBeenCalled();
    expect(play).not.toHaveBeenCalled();
    expect(document.querySelector('audio')).toBeNull();
    play.mockRestore();
  });

  it('goes straight home when the street cannot be read', async () => {
    respondWith({ error: 'No house yet' }, false);
    await openFinale();
    expect(push).toHaveBeenCalledWith('/?welcome=1');
  });

  it('goes home without the street when it is too slow', async () => {
    global.fetch = jest.fn(() => new Promise(() => {})) as jest.Mock;
    await openFinale();
    act(() => { jest.advanceTimersByTime(ARRIVAL_TIMEOUT_MS); });
    expect(push).toHaveBeenCalledTimes(1);
  });
});
