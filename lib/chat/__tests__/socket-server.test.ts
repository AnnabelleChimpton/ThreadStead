/**
 * @jest-environment node
 *
 * The chat socket server end to end: a real socket.io server on a random port
 * and real socket.io clients. Only the database and the session lookup are
 * mocked; presence and the rate limiter are the real in-memory ones.
 */
import { createServer, type Server as HttpServer } from 'http';
import type { AddressInfo } from 'net';
import { Server } from 'socket.io';
import { io as connectClient, type Socket as ClientSocket } from 'socket.io-client';

jest.mock('@/lib/config/database/connection', () => ({
  db: {
    chatRoom: { findUnique: jest.fn(), update: jest.fn() },
    chatMessage: { create: jest.fn() },
    conversation: { findMany: jest.fn(), create: jest.fn(), update: jest.fn(), findUnique: jest.fn() },
    directMessage: { create: jest.fn(), updateMany: jest.fn() },
    conversationParticipant: { update: jest.fn() },
  },
}));
jest.mock('@/lib/auth/server', () => ({ getSessionUser: jest.fn() }));
jest.mock('@/lib/domain/users/blocks', () => ({ isUserBlocked: jest.fn() }));

import { db } from '@/lib/config/database/connection';
import { getSessionUser } from '@/lib/auth/server';
import { isUserBlocked } from '@/lib/domain/users/blocks';
import { attachChatServer } from '../socket-server';
import { getRoomPresence } from '../presence';

const mockDb = db as unknown as {
  chatRoom: { findUnique: jest.Mock; update: jest.Mock };
  chatMessage: { create: jest.Mock };
  conversation: { findMany: jest.Mock; create: jest.Mock; update: jest.Mock; findUnique: jest.Mock };
  directMessage: { create: jest.Mock; updateMany: jest.Mock };
  conversationParticipant: { update: jest.Mock };
};
const mockGetSessionUser = getSessionUser as jest.Mock;
const mockIsUserBlocked = isUserBlocked as jest.Mock;

const ROOM = 'lounge';

const USERS = {
  alice: { id: 'u-alice', primaryHandle: 'alice@threadstead', role: 'member', profile: { displayName: 'Alice', avatarUrl: '/a.png', avatarThumbnailUrl: null } },
  bob: { id: 'u-bob', primaryHandle: 'bob@threadstead', role: 'member', profile: { displayName: 'Bob', avatarUrl: null, avatarThumbnailUrl: '/b-thumb.png' } },
  admin: { id: 'u-admin', primaryHandle: 'admin@threadstead', role: 'admin', profile: null },
};
type UserName = keyof typeof USERS;

let httpServer: HttpServer;
let ioServer: Server;
let chat: { close(): void };
let url: string;
const clients: ClientSocket[] = [];

function sessionFromCookie(cookie: string | undefined) {
  const name = cookie?.match(/retro_session=(\w+)/)?.[1] as UserName | undefined;
  return name ? USERS[name] : null;
}

/** Connect as a user (by name) or as a guest; resolves once connected. */
function connect(as?: UserName): Promise<ClientSocket> {
  const client = connectClient(url, {
    transports: ['websocket'],
    forceNew: true,
    reconnection: false,
    extraHeaders: as ? { cookie: `retro_session=${as}` } : {},
  });
  clients.push(client);
  return new Promise((resolve, reject) => {
    client.once('connect', () => resolve(client));
    client.once('connect_error', reject);
  });
}

function next<T = any>(client: ClientSocket, event: string, match: (data: T) => boolean = () => true, timeoutMs = 2000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      client.off(event, onEvent);
      reject(new Error(`timed out waiting for ${event}`));
    }, timeoutMs);
    function onEvent(data: T) {
      if (!match(data)) return;
      clearTimeout(timer);
      client.off(event, onEvent);
      resolve(data);
    }
    client.on(event, onEvent);
  });
}

/** Collects every payload of `event` so a test can assert something did NOT arrive. */
function record<T = any>(client: ClientSocket, event: string): T[] {
  const seen: T[] = [];
  client.on(event, (data: T) => seen.push(data));
  return seen;
}

const handles = (users: { handle: string | null }[]) => users.map((u) => u.handle).sort();

async function join(client: ClientSocket, expectHandles?: string[]) {
  const update = next<{ users: { handle: string | null }[] }>(client, 'presence:update', (d) =>
    expectHandles ? JSON.stringify(handles(d.users)) === JSON.stringify([...expectHandles].sort()) : true
  );
  client.emit('chat:join', { roomId: ROOM });
  return update;
}

async function until(check: () => boolean, timeoutMs = 2000) {
  const start = Date.now();
  while (!check()) {
    if (Date.now() - start > timeoutMs) throw new Error('condition not met in time');
    await new Promise((r) => setTimeout(r, 10));
  }
}

const tick = (ms = 50) => new Promise((r) => setTimeout(r, ms));

beforeEach(async () => {
  jest.clearAllMocks();
  globalThis.__threadsteadRoomPresence?.clear();

  mockGetSessionUser.mockImplementation(async (req: { headers: { cookie?: string } }) => sessionFromCookie(req.headers.cookie));
  mockDb.chatRoom.findUnique.mockImplementation(async ({ where }: { where: { id: string } }) =>
    where.id === ROOM ? { id: ROOM, topic: null, topicSetBy: null, topicSetAt: null } : null
  );
  mockDb.chatMessage.create.mockImplementation(async ({ data }: { data: { roomId: string; userId: string; body: string; isAction: boolean } }) => {
    const user = Object.values(USERS).find((u) => u.id === data.userId)!;
    return { id: 'm-' + Math.random(), ...data, createdAt: new Date(), user };
  });
  mockIsUserBlocked.mockResolvedValue(false);

  httpServer = createServer();
  ioServer = new Server(httpServer);
  chat = attachChatServer(ioServer);
  await new Promise<void>((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
  url = `http://127.0.0.1:${(httpServer.address() as AddressInfo).port}`;
});

afterEach(async () => {
  for (const c of clients.splice(0)) c.disconnect();
  chat.close();
  await new Promise<void>((resolve) => ioServer.close(() => resolve()));
});

describe('joining and presence', () => {
  it('lists signed-in users in presence but never guests', async () => {
    const guest = await connect();
    await join(guest, []);

    const alice = await connect('alice');
    const guestSees = next(guest, 'presence:update', (d: any) => d.users.length === 1);
    const update = await join(alice, ['alice@threadstead']);

    expect(update.users[0]).toMatchObject({
      userId: 'u-alice',
      handle: 'alice@threadstead',
      displayName: 'Alice',
      avatarUrl: '/a.png',
      status: 'online',
      statusMessage: null,
    });
    await guestSees;
    expect(handles(getRoomPresence(ROOM))).toEqual(['alice@threadstead']);
  });

  it('joins a signed-in user whose chat:join arrives before the session lookup finishes', async () => {
    // The July fix: listeners are registered before the DB round-trip, and
    // handlers wait for the session instead of treating the user as a guest.
    let releaseSession!: () => void;
    const gate = new Promise<void>((r) => (releaseSession = r));
    mockGetSessionUser.mockImplementationOnce(async (req: { headers: { cookie?: string } }) => {
      await gate;
      return sessionFromCookie(req.headers.cookie);
    });

    const alice = await connect('alice');
    const update = join(alice, ['alice@threadstead']);
    await tick();
    releaseSession();
    await update;
  });

  it('rejects a missing or unknown room', async () => {
    const alice = await connect('alice');

    const missing = next(alice, 'system:notice');
    alice.emit('chat:join', {});
    expect(await missing).toEqual({ message: 'Room ID required', type: 'error' });

    const unknown = next(alice, 'system:notice');
    alice.emit('chat:join', { roomId: 'made-up' });
    expect(await unknown).toEqual({ message: 'That room does not exist', type: 'error' });
    expect(getRoomPresence('made-up')).toEqual([]);
  });

  it('sends the room topic to the joining user', async () => {
    mockDb.chatRoom.findUnique.mockResolvedValueOnce({ id: ROOM, topic: 'Tea time', topicSetBy: 'u-admin', topicSetAt: new Date(0) });
    const alice = await connect('alice');
    const topic = next(alice, 'chat:topic');
    alice.emit('chat:join', { roomId: ROOM });
    expect(await topic).toMatchObject({ topic: 'Tea time', topicSetBy: 'u-admin' });
  });

  it('chat:leave removes the user and tells the room', async () => {
    const alice = await connect('alice');
    const bob = await connect('bob');
    await join(alice, ['alice@threadstead']);
    await join(bob, ['alice@threadstead', 'bob@threadstead']);

    const bobSees = next(bob, 'presence:update', (d: any) => d.users.length === 1);
    alice.emit('chat:leave');
    expect(handles((await bobSees).users)).toEqual(['bob@threadstead']);
  });

  it('disconnect removes the user unless another tab of theirs is still in the room', async () => {
    const tab1 = await connect('alice');
    const tab2 = await connect('alice');
    const bob = await connect('bob');
    await join(tab1, ['alice@threadstead']);
    await join(tab2, ['alice@threadstead']);
    await join(bob, ['alice@threadstead', 'bob@threadstead']);

    tab1.disconnect();
    await tick(100);
    expect(handles(getRoomPresence(ROOM))).toEqual(['alice@threadstead', 'bob@threadstead']);

    const bobSees = next(bob, 'presence:update', (d: any) => d.users.length === 1);
    tab2.disconnect();
    expect(handles((await bobSees).users)).toEqual(['bob@threadstead']);
  });

  it('does not leave a ghost when the socket disconnects while chat:join is still looking up the room', async () => {
    let releaseRoom!: () => void;
    const gate = new Promise<void>((r) => (releaseRoom = r));
    mockDb.chatRoom.findUnique.mockImplementationOnce(async () => {
      await gate;
      return { id: ROOM, topic: null, topicSetBy: null, topicSetAt: null };
    });

    const alice = await connect('alice');
    alice.emit('chat:join', { roomId: ROOM });
    await until(() => mockDb.chatRoom.findUnique.mock.calls.length === 1);

    alice.disconnect();
    await until(() => ioServer.of('/').sockets.size === 0);
    await tick(); // let the server's disconnect handler finish
    releaseRoom();
    await tick(100);

    expect(getRoomPresence(ROOM)).toEqual([]);
    expect(ioServer.of('/').adapter.rooms.get(ROOM)).toBeUndefined();
  });

  it('chat:status updates presence for the room', async () => {
    const alice = await connect('alice');
    await join(alice, ['alice@threadstead']);
    const update = next(alice, 'presence:update', (d: any) => d.users[0]?.status === 'away');
    alice.emit('chat:status', { roomId: ROOM, status: 'away', message: '  making tea  ' });
    expect((await update).users[0]).toMatchObject({ status: 'away', statusMessage: 'making tea' });
  });
});

describe('messages', () => {
  it('broadcasts a sanitized message to everyone in the room, guests included', async () => {
    const guest = await connect();
    const alice = await connect('alice');
    await join(guest);
    await join(alice, ['alice@threadstead']);

    const guestGets = next(guest, 'chat:message');
    alice.emit('chat:message', { roomId: ROOM, body: '  /me waves <b>hi</b>  ' });
    const msg = await guestGets;

    expect(msg).toMatchObject({ roomId: ROOM, userId: 'u-alice', handle: 'alice@threadstead', body: 'waves hi', isAction: true });
    expect(mockDb.chatMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { roomId: ROOM, userId: 'u-alice', body: 'waves hi', isAction: true } })
    );
  });

  it('refuses messages from guests, from outside the room, and empty ones', async () => {
    const guest = await connect();
    await join(guest);
    const guestNotice = next(guest, 'system:notice');
    guest.emit('chat:message', { roomId: ROOM, body: 'hello' });
    expect(await guestNotice).toEqual({ message: 'You must be logged in to send messages', type: 'error' });

    const alice = await connect('alice');
    const outside = next(alice, 'system:notice');
    alice.emit('chat:message', { roomId: ROOM, body: 'hello' });
    expect(await outside).toEqual({ message: 'You must join a room first', type: 'error' });

    await join(alice);
    const empty = next(alice, 'system:notice');
    alice.emit('chat:message', { roomId: ROOM, body: '<i></i>' });
    expect(await empty).toEqual({ message: 'Message cannot be empty', type: 'error' });
    expect(mockDb.chatMessage.create).not.toHaveBeenCalled();
  });

  it('resolves /roll on the server', async () => {
    const alice = await connect('alice');
    await join(alice);
    const msg = next(alice, 'chat:message');
    alice.emit('chat:message', { roomId: ROOM, body: '/roll 6' });
    expect((await msg).body).toMatch(/^rolls [1-6] \(1-6\)$/);
  });

  it('allows 5 messages per 10 seconds, then warns', async () => {
    const alice = await connect('alice');
    await join(alice);
    const received = record(alice, 'chat:message');
    const warning = next(alice, 'system:notice');
    for (let i = 1; i <= 6; i++) alice.emit('chat:message', { roomId: ROOM, body: `m${i}` });

    expect(await warning).toEqual({ message: "You're sending messages too quickly. Please slow down.", type: 'warning' });
    await until(() => received.length === 5);
    await tick();
    expect(received).toHaveLength(5);
  });
});

describe('whispers', () => {
  it('reaches only the target and the sender', async () => {
    const alice = await connect('alice');
    const bob = await connect('bob');
    const guest = await connect();
    await join(alice, ['alice@threadstead']);
    await join(bob, ['alice@threadstead', 'bob@threadstead']);
    await join(guest);
    const guestMessages = record(guest, 'chat:message');

    const bobGets = next(bob, 'chat:message');
    const aliceGets = next(alice, 'chat:message');
    alice.emit('chat:whisper', { roomId: ROOM, targetHandle: 'BOB', message: 'psst <script>x</script>' });

    const [toBob, toAlice] = await Promise.all([bobGets, aliceGets]);
    expect(toBob).toMatchObject({ isWhisper: true, whisperTo: 'bob@threadstead', userId: 'u-alice', body: 'psst x' });
    expect(toAlice).toEqual(toBob);
    await tick();
    expect(guestMessages).toEqual([]);
    expect(mockIsUserBlocked).toHaveBeenCalledWith('u-bob', 'u-alice');
  });

  it('says "not found" when the target has blocked the sender, and delivers nothing', async () => {
    mockIsUserBlocked.mockImplementation(async (blocker: string, blocked: string) => blocker === 'u-bob' && blocked === 'u-alice');
    const alice = await connect('alice');
    const bob = await connect('bob');
    await join(alice, ['alice@threadstead']);
    await join(bob, ['alice@threadstead', 'bob@threadstead']);
    const bobMessages = record(bob, 'chat:message');

    const notice = next(alice, 'system:notice');
    alice.emit('chat:whisper', { roomId: ROOM, targetHandle: 'bob', message: 'hi' });
    expect(await notice).toEqual({ message: 'User @bob not found in this room', type: 'error' });
    await tick();
    expect(bobMessages).toEqual([]);
  });

  it('says "not found" for someone who is not in the room', async () => {
    const alice = await connect('alice');
    await join(alice);
    const notice = next(alice, 'system:notice');
    alice.emit('chat:whisper', { roomId: ROOM, targetHandle: 'carol', message: 'hi' });
    expect(await notice).toEqual({ message: 'User @carol not found in this room', type: 'error' });
  });

  it('ignores whispers from guests', async () => {
    const guest = await connect();
    const bob = await connect('bob');
    await join(bob, ['bob@threadstead']);
    await join(guest);
    const bobMessages = record(bob, 'chat:message');
    guest.emit('chat:whisper', { roomId: ROOM, targetHandle: 'bob', message: 'hi' });
    await tick(100);
    expect(bobMessages).toEqual([]);
  });
});

describe('topic', () => {
  it('only admins can set it', async () => {
    const alice = await connect('alice');
    await join(alice);
    const notice = next(alice, 'system:notice');
    alice.emit('chat:set_topic', { roomId: ROOM, topic: 'mine now' });
    expect(await notice).toEqual({ message: 'Only admins can set the room topic', type: 'error' });

    const admin = await connect('admin');
    await join(admin);
    const aliceSees = next(alice, 'chat:topic');
    admin.emit('chat:set_topic', { roomId: ROOM, topic: '  Welcome  ' });
    expect(await aliceSees).toMatchObject({ topic: 'Welcome', topicSetBy: 'u-admin' });
    expect(mockDb.chatRoom.update).toHaveBeenCalledTimes(1);
  });
});

describe('direct messages', () => {
  beforeEach(() => {
    mockDb.conversation.findMany.mockResolvedValue([]);
    mockDb.conversation.create.mockResolvedValue({ id: 'c-1' });
    mockDb.directMessage.create.mockImplementation(async ({ data }: { data: { senderId: string; body: string } }) => ({
      id: 'dm-1',
      ...data,
      createdAt: new Date(),
      sender: Object.values(USERS).find((u) => u.id === data.senderId),
    }));
  });

  it('delivers to both people and creates the conversation once', async () => {
    const alice = await connect('alice');
    const bob = await connect('bob');
    await tick(); // let both sessions resolve so they're in their personal rooms

    const bobGets = next(bob, 'dm:new_message');
    const aliceGets = next(alice, 'dm:new_message');
    alice.emit('dm:send', { targetUserId: 'u-bob', body: 'hello <b>bob</b>' });
    const [toBob, toAlice] = await Promise.all([bobGets, aliceGets]);

    expect(toBob).toMatchObject({ conversationId: 'c-1', senderId: 'u-alice', handle: 'alice@threadstead', body: 'hello bob', isRead: false });
    expect(toAlice).toEqual(toBob);
    expect(mockDb.conversation.create).toHaveBeenCalledWith({
      data: { participants: { create: [{ userId: 'u-alice' }, { userId: 'u-bob' }] } },
    });
  });

  it('reuses an existing 1-on-1 conversation', async () => {
    mockDb.conversation.findMany.mockResolvedValue([
      { id: 'group', participants: [{ userId: 'u-alice' }, { userId: 'u-bob' }, { userId: 'u-admin' }] },
      { id: 'c-existing', participants: [{ userId: 'u-alice' }, { userId: 'u-bob' }] },
    ]);
    const alice = await connect('alice');
    const sent = next(alice, 'dm:new_message');
    alice.emit('dm:send', { targetUserId: 'u-bob', body: 'again' });
    expect((await sent).conversationId).toBe('c-existing');
    expect(mockDb.conversation.create).not.toHaveBeenCalled();
  });

  it('refuses when the recipient has blocked the sender', async () => {
    mockIsUserBlocked.mockResolvedValue(true);
    const alice = await connect('alice');
    const notice = next(alice, 'system:notice');
    alice.emit('dm:send', { targetUserId: 'u-bob', body: 'hello' });
    expect(await notice).toEqual({ message: 'You cannot send messages to this user.', type: 'error' });
    expect(mockIsUserBlocked).toHaveBeenCalledWith('u-bob', 'u-alice');
    expect(mockDb.directMessage.create).not.toHaveBeenCalled();
  });

  it('refuses guests and messages to yourself', async () => {
    const guest = await connect();
    const guestNotice = next(guest, 'system:notice');
    guest.emit('dm:send', { targetUserId: 'u-bob', body: 'hi' });
    expect(await guestNotice).toEqual({ message: 'Guests cannot send DMs', type: 'error' });

    const alice = await connect('alice');
    const selfNotice = next(alice, 'system:notice');
    alice.emit('dm:send', { targetUserId: 'u-alice', body: 'hi me' });
    expect(await selfNotice).toEqual({ message: 'You cannot message yourself', type: 'error' });
  });

  it('dm:read marks the conversation read and sends a receipt to the other person', async () => {
    mockDb.conversation.findUnique.mockResolvedValue({ id: 'c-1', participants: [{ userId: 'u-alice' }, { userId: 'u-bob' }] });
    const alice = await connect('alice');
    const bob = await connect('bob');
    await tick();

    const receipt = next(alice, 'dm:read_receipt');
    bob.emit('dm:read', { conversationId: 'c-1' });
    expect(await receipt).toMatchObject({ conversationId: 'c-1', readByUserId: 'u-bob' });
    expect(mockDb.directMessage.updateMany).toHaveBeenCalledWith({
      where: { conversationId: 'c-1', senderId: { not: 'u-bob' }, isRead: false },
      data: { isRead: true },
    });
  });
});
