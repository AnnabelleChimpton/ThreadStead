/**
 * Brave's 1 request/second queue. The engine is a process-wide singleton, so
 * the queue must stay bounded under load and must not hold slots for
 * searches whose caller already gave up.
 */

import { BraveSearchEngine } from '../engines/brave';

const okResponse = {
  ok: true,
  status: 200,
  statusText: 'OK',
  json: async () => ({ web: { results: [] } }),
  text: async () => '',
};

describe('BraveSearchEngine rate limiting', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    fetchMock = jest.fn(async (_url: string, init?: { signal?: AbortSignal }) => {
      if (init?.signal?.aborted) throw new Error('aborted');
      return okResponse;
    });
    (globalThis as any).fetch = fetchMock;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('spaces requests one second apart', async () => {
    const engine = new BraveSearchEngine({ apiKey: 'test' });
    const searches = [1, 2, 3].map((i) => engine.search({ q: `q${i}` }));

    await jest.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(1000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await jest.advanceTimersByTimeAsync(1000);
    expect(fetchMock).toHaveBeenCalledTimes(3);

    await expect(Promise.all(searches)).resolves.toHaveLength(3);
  });

  test('fails fast once the queue is full instead of growing it', async () => {
    const engine = new BraveSearchEngine({ apiKey: 'test' });
    // Ten arrive at once: five get a place in the queue, the rest are refused.
    const searches = Array.from({ length: 10 }, (_, i) =>
      engine.search({ q: `q${i}` }).then(() => 'ok', (e: Error) => e.message)
    );

    await jest.advanceTimersByTimeAsync(10_000);
    const outcomes = await Promise.all(searches);

    expect(outcomes.filter((o) => o === 'ok')).toHaveLength(5);
    expect(outcomes.filter((o) => String(o).includes('busy'))).toHaveLength(5);
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });

  test('an aborted search leaves the queue without using a slot', async () => {
    const engine = new BraveSearchEngine({ apiKey: 'test' });
    const first = engine.search({ q: 'first' });
    const controller = new AbortController();
    const abandoned = engine.search({ q: 'abandoned' }, controller.signal).then(
      () => 'ok',
      () => 'aborted'
    );
    const third = engine.search({ q: 'third' });

    await jest.advanceTimersByTimeAsync(0);
    controller.abort();
    await expect(abandoned).resolves.toBe('aborted');

    // The third search takes the abandoned one's slot, one second after the first.
    await jest.advanceTimersByTimeAsync(1000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toContain('q=third');

    await expect(Promise.all([first, third])).resolves.toHaveLength(2);
  });
});
