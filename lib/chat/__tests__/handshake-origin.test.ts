/**
 * @jest-environment node
 *
 * Browsers don't CORS-check a WebSocket handshake, and it carries the
 * visitor's cookies. In production the chat server only takes handshakes
 * from the site itself (allowChatHandshake, wired in server.ts), so another
 * site or a resident subdomain can't open a chat socket as the visitor.
 * A real socket.io server and clients, over both transports.
 */
import { createServer, type Server as HttpServer } from 'http';
import type { AddressInfo } from 'net';
import { Server } from 'socket.io';
import { io as connectClient } from 'socket.io-client';

jest.mock('@/lib/config/database/connection', () => ({ db: {} }));
jest.mock('@/lib/auth/server', () => ({ getSessionUser: jest.fn() }));
jest.mock('@/lib/config/site-url', () => ({ getSiteBaseUrl: () => 'https://homepageagain.com' }));

import { allowChatHandshake } from '../socket-server';

let httpServer: HttpServer;
let ioServer: Server;
let url: string;
const ORIGINAL_NODE_ENV = process.env.NODE_ENV;
const setNodeEnv = (v: string | undefined) => ((process.env as Record<string, string | undefined>).NODE_ENV = v);

beforeEach(async () => {
  httpServer = createServer();
  ioServer = new Server(httpServer, { allowRequest: allowChatHandshake });
  await new Promise<void>((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
  url = `http://127.0.0.1:${(httpServer.address() as AddressInfo).port}`;
});

afterEach(async () => {
  setNodeEnv(ORIGINAL_NODE_ENV);
  await new Promise<void>((resolve) => ioServer.close(() => resolve()));
});

/** 'connected', or the connect_error message */
function tryConnect(headers: Record<string, string>, transport: 'websocket' | 'polling'): Promise<string> {
  const client = connectClient(url, { transports: [transport], forceNew: true, reconnection: false, extraHeaders: headers });
  return new Promise((resolve) => {
    client.once('connect', () => {
      client.disconnect();
      resolve('connected');
    });
    client.once('connect_error', (err) => {
      client.disconnect();
      resolve(err.message);
    });
  });
}

describe.each(['websocket', 'polling'] as const)('in production, over %s', (transport) => {
  beforeEach(() => setNodeEnv('production'));

  test.each([
    ['the site', { origin: 'https://homepageagain.com' }],
    ['the site, by Sec-Fetch-Site', { 'sec-fetch-site': 'same-origin' }],
  ])('takes a handshake from %s', async (_name, headers) => {
    expect(await tryConnect(headers, transport)).toBe('connected');
  });

  test.each([
    ['another site', { origin: 'https://evil.test' }],
    ['a resident subdomain', { origin: 'https://alice.homepageagain.com' }],
    ['a subdomain, by Sec-Fetch-Site', { 'sec-fetch-site': 'same-site' }],
  ])('refuses one from %s', async (_name, headers) => {
    expect(await tryConnect(headers, transport)).not.toBe('connected');
  });
});

test('dev takes any origin (phones and LAN hosts)', async () => {
  setNodeEnv('development');
  expect(await tryConnect({ origin: 'https://192.168.1.20:3000' }, 'websocket')).toBe('connected');
});

test('the callback says why', () => {
  setNodeEnv('production');
  const callback = jest.fn();
  allowChatHandshake({ headers: { origin: 'https://evil.test' } } as never, callback);
  expect(callback).toHaveBeenCalledWith(expect.stringMatching(/this site/), false);
});
