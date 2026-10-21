import React, { useState } from 'react';
import { act, render, screen, fireEvent } from '@testing-library/react';

jest.mock('@/components/ui/PixelIcon', () => ({
  PixelIcon: ({ name }: { name: string }) => <span data-testid={`pixel-icon-${name}`} />,
}));

import SmartUrlShortener from '../SmartUrlShortener';

// URLs over 500 chars are auto-shortened via tinyurl. The replace used to run
// on the `content` captured when the request STARTED, so anything typed while
// it was in flight was thrown away — and every keystroke fired another request.
const LONG_URL = 'https://example.com/' + 'a'.repeat(600);
const SHORT_URL = 'https://tinyurl.com/abc123';

function Editor() {
  const [content, setContent] = useState(`see ${LONG_URL}`);
  return (
    <>
      <textarea aria-label="body" value={content} onChange={(e) => setContent(e.target.value)} />
      <SmartUrlShortener content={content} onContentChange={setContent} />
    </>
  );
}

describe('SmartUrlShortener auto-shorten', () => {
  let resolveFetch: (value: unknown) => void;
  const fetchMock = jest.fn(
    () => new Promise((resolve) => { resolveFetch = resolve; })
  );

  beforeEach(() => {
    fetchMock.mockClear();
    (global as unknown as { fetch: unknown }).fetch = fetchMock;
  });

  it('keeps text typed while the request is in flight, and asks only once', async () => {
    render(<Editor />);
    const body = screen.getByLabelText('body') as HTMLTextAreaElement;
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fireEvent.change(body, { target: { value: `see ${LONG_URL} and more` } });
    fireEvent.change(body, { target: { value: `see ${LONG_URL} and more typing` } });

    await act(async () => {
      resolveFetch({ text: async () => SHORT_URL });
    });

    expect(body.value).toBe(`see ${SHORT_URL} and more typing`);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
