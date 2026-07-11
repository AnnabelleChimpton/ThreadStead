import { renderHook, act } from '@testing-library/react';
import { useLocalDraft } from '../useLocalDraft';

const KEY = 'threadstead:draft:test';

describe('useLocalDraft', () => {
  beforeEach(() => {
    window.localStorage.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('surfaces no draft when storage is empty', () => {
    const { result } = renderHook(() => useLocalDraft(KEY, { css: 'a' }, false));
    expect(result.current.pendingDraft).toBeNull();
  });

  it('surfaces a stored draft that differs from the loaded value', () => {
    window.localStorage.setItem(KEY, JSON.stringify({ data: { css: 'draft!' }, savedAt: 123 }));
    const { result } = renderHook(() => useLocalDraft(KEY, { css: 'server value' }, false));
    expect(result.current.pendingDraft).toEqual({ data: { css: 'draft!' }, savedAt: 123 });
  });

  it('drops a stored draft that matches the loaded value', () => {
    window.localStorage.setItem(KEY, JSON.stringify({ data: { css: 'same' }, savedAt: 123 }));
    const { result } = renderHook(() => useLocalDraft(KEY, { css: 'same' }, false));
    expect(result.current.pendingDraft).toBeNull();
    expect(window.localStorage.getItem(KEY)).toBeNull();
  });

  it('drops corrupt drafts without crashing', () => {
    window.localStorage.setItem(KEY, 'not json{');
    const { result } = renderHook(() => useLocalDraft(KEY, { css: 'a' }, false));
    expect(result.current.pendingDraft).toBeNull();
    expect(window.localStorage.getItem(KEY)).toBeNull();
  });

  it('persists the live value after the debounce while dirty', () => {
    const { rerender } = renderHook(
      ({ value, dirty }) => useLocalDraft(KEY, value, dirty),
      { initialProps: { value: { css: 'a' }, dirty: false } }
    );

    rerender({ value: { css: 'ab' }, dirty: true });
    expect(window.localStorage.getItem(KEY)).toBeNull();

    act(() => { jest.advanceTimersByTime(900); });
    const stored = JSON.parse(window.localStorage.getItem(KEY)!);
    expect(stored.data).toEqual({ css: 'ab' });
    expect(typeof stored.savedAt).toBe('number');
  });

  it('does not persist while clean', () => {
    renderHook(() => useLocalDraft(KEY, { css: 'a' }, false));
    act(() => { jest.advanceTimersByTime(2000); });
    expect(window.localStorage.getItem(KEY)).toBeNull();
  });

  it('clearDraft removes storage and the pending draft', () => {
    window.localStorage.setItem(KEY, JSON.stringify({ data: { css: 'old' }, savedAt: 1 }));
    const { result } = renderHook(() => useLocalDraft(KEY, { css: 'new' }, false));
    expect(result.current.pendingDraft).not.toBeNull();

    act(() => { result.current.clearDraft(); });
    expect(result.current.pendingDraft).toBeNull();
    expect(window.localStorage.getItem(KEY)).toBeNull();
  });

  it('keeps the latest value when edits continue during the debounce', () => {
    const { rerender } = renderHook(
      ({ value, dirty }) => useLocalDraft(KEY, value, dirty),
      { initialProps: { value: { css: 'a' }, dirty: false } }
    );

    rerender({ value: { css: 'ab' }, dirty: true });
    act(() => { jest.advanceTimersByTime(400); });
    rerender({ value: { css: 'abc' }, dirty: true });
    act(() => { jest.advanceTimersByTime(900); });

    const stored = JSON.parse(window.localStorage.getItem(KEY)!);
    expect(stored.data).toEqual({ css: 'abc' });
  });
});
