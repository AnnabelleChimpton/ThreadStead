/**
 * A refused capability mint reaches the person in the server's own words:
 * someone leaving hears how to stay, not "upload failed".
 */
import { CapabilityError, requestCapability } from '../capability';

const LEAVING = "Your account is set to be deleted on 6 November. If you'd like to stay, press Keep my account at the top of the page.";

function reply(status: number, body: unknown) {
  global.fetch = jest.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  })) as unknown as typeof fetch;
}

async function refusal(promise: Promise<unknown>): Promise<CapabilityError> {
  const error = await promise.then(() => null, (e: unknown) => e);
  expect(error).toBeInstanceOf(CapabilityError);
  return error as CapabilityError;
}

test('returns the token', async () => {
  reply(200, { token: 'cap', resource: 'user:u1/media', expSec: 600 });
  await expect(requestCapability('media')).resolves.toBe('cap');
  expect(global.fetch).toHaveBeenCalledWith('/api/cap/media', { method: 'POST' });
});

test('sends a body as JSON when given one', async () => {
  reply(200, { token: 'cap' });
  await requestCapability('photo-comment', { photoId: 'p1' });
  expect(global.fetch).toHaveBeenCalledWith('/api/cap/photo-comment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ photoId: 'p1' }),
  });
});

test('someone leaving hears the server, word for word', async () => {
  reply(403, { error: LEAVING, code: 'account_leaving' });
  const error = await refusal(requestCapability('comments/post-1'));
  expect(error.message).toBe(LEAVING);
  expect(error.status).toBe(403);
});

test('signed out is a 401 callers can tell apart', async () => {
  reply(401, { error: 'not logged in' });
  const error = await refusal(requestCapability('post'));
  expect(error.status).toBe(401);
  expect(error.message).toBe('Please log in.');
});

test('a refusal without words gets a plain one', async () => {
  global.fetch = jest.fn(async () => ({
    ok: false,
    status: 502,
    json: async () => {
      throw new SyntaxError('Unexpected token <');
    },
  })) as unknown as typeof fetch;
  const error = await refusal(requestCapability('profile'));
  expect(error.status).toBe(502);
  expect(error.message).toBe("Couldn't do that. Try again in a moment.");
});

test('no network says so', async () => {
  global.fetch = jest.fn(async () => {
    throw new TypeError('Failed to fetch');
  }) as unknown as typeof fetch;
  const error = await refusal(requestCapability('media'));
  expect(error.status).toBe(0);
  expect(error.message).toBe("Couldn't reach the server. Try again in a moment.");
});
