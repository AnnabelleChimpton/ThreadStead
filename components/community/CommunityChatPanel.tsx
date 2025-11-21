'use client';

import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { csrfFetchJson } from '@/lib/api/client/csrf-fetch';
import { PixelIcon } from '@/components/ui/PixelIcon';
import RetroButton from '@/components/ui/feedback/RetroButton';
import UserQuickView from '@/components/ui/feedback/UserQuickView';

interface ChatMessage {
  id: string;
  roomId: string;
  userId: string;
  handle: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  body: string;
  createdAt: string | Date;
}

interface PresenceUser {
  userId: string;
  handle: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  lastActiveAt: string;
}

interface MuteInfo {
  userId: string;
  handle: string | null;
  displayName?: string | null;
  mutedAt: string;
}

const ROOM_ID = 'lounge';

interface CommunityChatPanelProps {
  fullscreen?: boolean;
}

export default function CommunityChatPanel({ fullscreen = false }: CommunityChatPanelProps) {
  const { user, loading: userLoading } = useCurrentUser();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [presence, setPresence] = useState<PresenceUser[]>([]);
  const [mutedUsers, setMutedUsers] = useState<Set<string>>(new Set());
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(false);
  const [systemNotice, setSystemNotice] = useState<string | null>(null);
  const [showUserMenu, setShowUserMenu] = useState<string | null>(null);
  const [selectedUsername, setSelectedUsername] = useState<string | null>(null);
  const [showMobilePresence, setShowMobilePresence] = useState(false);

  const messageListRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom (scrolls only the message container, not the entire page)
  const scrollToBottom = () => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  };

  // Load initial data
  useEffect(() => {
    if (!user) return;

    const loadInitialData = async () => {
      try {
        // Load messages
        const messagesRes = await fetch(`/api/chat/rooms/${ROOM_ID}/messages?limit=50`, {
          credentials: 'include',
        });
        if (messagesRes.ok) {
          const data = await messagesRes.json();
          setMessages(data.messages || []);
        }

        // Presence will be loaded via Socket.io upon connection
        // (removed API fetch to avoid race condition)

        // Load mutes
        const mutesRes = await fetch('/api/chat/mutes', {
          credentials: 'include',
        });
        if (mutesRes.ok) {
          const data = await mutesRes.json();
          const muteSet = new Set<string>(data.mutes.map((m: MuteInfo) => m.userId));
          setMutedUsers(muteSet);
        }

        setLoading(false);
      } catch (error) {
        console.error('Error loading chat data:', error);
        setLoading(false);
      }
    };

    loadInitialData();
  }, [user]);

  // Connect to Socket.io
  useEffect(() => {
    if (!user) return;

    const newSocket = io({
      withCredentials: true,
    });

    newSocket.on('connect', () => {
      setConnected(true);
      newSocket.emit('chat:join', { roomId: ROOM_ID });
    });

    newSocket.on('disconnect', () => {
      setConnected(false);
    });

    newSocket.on('chat:message', (message: ChatMessage) => {
      setMessages((prev) => [...prev, message]);
      setTimeout(scrollToBottom, 100);
    });

    newSocket.on('presence:update', (data: { users: PresenceUser[] }) => {
      setPresence(data.users);
    });

    newSocket.on('system:notice', (data: { message: string; type: string }) => {
      setSystemNotice(data.message);
      setTimeout(() => setSystemNotice(null), 5000);
    });

    setSocket(newSocket);

    return () => {
      newSocket.emit('chat:leave');
      newSocket.close();
    };
  }, [user]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!socket || !messageInput.trim() || sending) return;

    const body = messageInput.trim();
    if (body.length > 280) {
      setSystemNotice('Message too long (max 280 characters)');
      return;
    }

    setSending(true);
    setMessageInput('');

    socket.emit('chat:message', {
      roomId: ROOM_ID,
      body,
    });

    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleMuteUser = async (userId: string) => {
    try {
      await csrfFetchJson('/api/chat/mutes', {
        method: 'POST',
        body: { mutedUserId: userId },
      });

      setMutedUsers((prev) => new Set(prev).add(userId));
      setShowUserMenu(null);
    } catch (error) {
      console.error('Error muting user:', error);
    }
  };

  const handleUnmuteUser = async (userId: string) => {
    try {
      await csrfFetchJson(`/api/chat/mutes/${userId}`, {
        method: 'DELETE',
      });

      setMutedUsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
      setShowUserMenu(null);
    } catch (error) {
      console.error('Error unmuting user:', error);
    }
  };

  // Don't filter muted users - show them with mute indicator instead
  const filteredMessages = messages;
  const filteredPresence = presence;

  const getDisplayName = (msg: ChatMessage) => {
    return msg.displayName || msg.handle || 'Anonymous';
  };

  const formatTime = (date: string | Date) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  if (userLoading || !user) {
    return (
      <div className="p-4 text-center text-thread-sage">
        Please log in to join the chat
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 text-center text-thread-sage">
        Loading chat...
      </div>
    );
  }

  const chatHeight = fullscreen
    ? 'h-[calc(100vh-8rem)] sm:h-[calc(100vh-9rem)] md:h-[calc(100vh-10rem)]'
    : 'h-[400px] sm:h-[500px] md:h-[600px]';

  return (
    <div className={`flex flex-col ${chatHeight} bg-thread-paper border border-thread-sage rounded-lg shadow-[2px_2px_0_#A18463]`}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-thread-sage bg-thread-cream">
        <div className="flex items-center gap-2">
          <PixelIcon name="chat" size={20} className="text-thread-pine" />
          <h3 className="text-sm font-bold text-thread-pine">Lounge</h3>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-thread-meadow' : 'bg-thread-stone'}`} />
            <span className="text-xs text-thread-sage hidden sm:inline">
              {connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <button
            onClick={() => setShowMobilePresence(!showMobilePresence)}
            className="md:hidden text-thread-sage hover:text-thread-pine transition-colors p-1"
            title="Show participants"
          >
            <PixelIcon name="users" size={16} />
            <span className="sr-only">Toggle participants</span>
          </button>
          {!fullscreen && (
            <a
              href="/chat"
              target="_blank"
              rel="noopener noreferrer"
              className="text-thread-sage hover:text-thread-pine transition-colors p-1"
              title="Open in new window"
            >
              <PixelIcon name="external-link" size={16} />
            </a>
          )}
        </div>
      </div>

      {/* System Notice */}
      {systemNotice && (
        <div className="px-3 py-2 bg-thread-sunset/20 text-sm text-thread-pine border-b border-thread-sage">
          {systemNotice}
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Messages */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div
            ref={messageListRef}
            className="flex-1 overflow-y-auto p-3 space-y-2"
            style={{ scrollbarWidth: 'thin' }}
          >
            {filteredMessages.map((msg, idx) => {
              const isOwnMessage = msg.userId === user.id;
              const isMuted = mutedUsers.has(msg.userId);
              return (
                <div
                  key={msg.id}
                  className={`flex gap-2 p-2 rounded ${
                    isOwnMessage ? 'bg-thread-cream/50' : isMuted ? 'bg-thread-stone/10' : 'hover:bg-thread-paper'
                  }`}
                >
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    {msg.avatarUrl ? (
                      <img
                        src={msg.avatarUrl}
                        alt={getDisplayName(msg)}
                        className={`w-8 h-8 rounded-full border border-thread-sage ${isMuted ? 'opacity-40' : ''}`}
                      />
                    ) : (
                      <div className={`w-8 h-8 rounded-full bg-thread-stone border border-thread-sage flex items-center justify-center ${isMuted ? 'opacity-40' : ''}`}>
                        <span className="text-xs text-thread-paper">
                          {getDisplayName(msg)[0]?.toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Message Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span
                        onClick={() => msg.handle && setSelectedUsername(msg.handle.split('@')[0])}
                        className={`font-semibold text-sm cursor-pointer hover:underline ${isMuted ? 'text-thread-sage' : 'text-thread-pine'}`}
                      >
                        {getDisplayName(msg)}
                      </span>
                      {isMuted && (
                        <span className="text-xs text-thread-sage italic">(muted)</span>
                      )}
                      <span className="text-xs text-thread-sage/70">
                        {formatTime(msg.createdAt)}
                      </span>
                      {/* Menu Button */}
                      {!isOwnMessage && (
                        <div className="relative ml-auto">
                          <button
                            onClick={() => setShowUserMenu(showUserMenu === msg.id ? null : msg.id)}
                            className="text-thread-sage hover:text-thread-pine text-sm px-2 py-1 min-h-[32px] min-w-[32px] flex items-center justify-center"
                          >
                            •••
                          </button>
                          {showUserMenu === msg.id && (
                            <div className="absolute right-0 top-full mt-1 bg-thread-paper border border-thread-sage rounded shadow-lg z-10">
                              {isMuted ? (
                                <button
                                  onClick={() => handleUnmuteUser(msg.userId)}
                                  className="block w-full text-left px-4 py-3 text-sm hover:bg-thread-cream text-thread-pine whitespace-nowrap min-h-[44px]"
                                >
                                  Unmute @{msg.handle || 'user'}
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleMuteUser(msg.userId)}
                                  className="block w-full text-left px-4 py-3 text-sm hover:bg-thread-cream text-thread-pine whitespace-nowrap min-h-[44px]"
                                >
                                  Mute @{msg.handle || 'user'}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className={`text-sm whitespace-pre-wrap break-words ${isMuted ? 'text-thread-sage/70 italic' : 'text-thread-charcoal'}`}>
                      {isMuted ? 'Message hidden (user muted)' : msg.body}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Input Area */}
          <div className="border-t border-thread-sage p-2 sm:p-3"
            style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom, 0px))' }}
          >
            <div className="flex gap-2">
              <textarea
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 text-sm sm:text-base border border-thread-sage rounded bg-white text-thread-charcoal resize-none min-h-[44px]"
                rows={1}
                maxLength={280}
                disabled={!connected || sending}
                style={{ WebkitOverflowScrolling: 'touch' }}
              />
              <RetroButton
                onClick={handleSendMessage}
                loading={sending}
                disabled={!connected || !messageInput.trim() || sending}
                className="px-3 sm:px-4 self-end min-h-[44px] min-w-[60px] sm:min-w-[80px]"
              >
                <span className="hidden sm:inline">Send</span>
                <span className="sm:hidden">→</span>
              </RetroButton>
            </div>
            <div className="text-xs text-thread-sage mt-1">
              {messageInput.length}/280
            </div>
          </div>
        </div>

        {/* Presence Sidebar - Desktop */}
        <div className="hidden md:block w-48 border-l border-thread-sage bg-thread-cream/30 overflow-y-auto">
          <div className="p-3">
            <h4 className="text-xs font-bold text-thread-pine mb-2">
              In the Lounge ({filteredPresence.length})
            </h4>
            <div className="space-y-2">
              {filteredPresence.map((p) => {
                const isMuted = mutedUsers.has(p.userId);
                const isCurrentUser = p.userId === user.id;
                return (
                  <div key={p.userId} className="flex items-center gap-2 relative group">
                    {p.avatarUrl ? (
                      <img
                        src={p.avatarUrl}
                        alt={p.displayName || p.handle || 'User'}
                        className={`w-6 h-6 rounded-full border border-thread-sage ${isMuted ? 'opacity-40' : ''}`}
                      />
                    ) : (
                      <div className={`w-6 h-6 rounded-full bg-thread-stone border border-thread-sage flex items-center justify-center ${isMuted ? 'opacity-40' : ''}`}>
                        <span className="text-xs text-thread-paper">
                          {(p.displayName || p.handle || 'A')[0].toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <span
                        onClick={() => !isCurrentUser && p.handle && setSelectedUsername(p.handle.split('@')[0])}
                        className={`text-xs truncate block ${!isCurrentUser ? 'cursor-pointer hover:underline' : ''} ${isMuted ? 'text-thread-sage' : 'text-thread-pine'}`}
                      >
                        {p.displayName || p.handle}
                      </span>
                      {isMuted && (
                        <button
                          onClick={() => handleUnmuteUser(p.userId)}
                          className="text-xs text-thread-sunset hover:underline"
                        >
                          Unmute
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Presence Overlay */}
      {showMobilePresence && (
        <div className="md:hidden fixed inset-0 z-50 flex items-end justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowMobilePresence(false)}
          />

          {/* Presence Sheet */}
          <div className="relative w-full max-h-[60vh] bg-thread-paper border-t-2 border-thread-sage rounded-t-2xl shadow-xl overflow-y-auto"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <div className="sticky top-0 bg-thread-cream border-b border-thread-sage p-4 flex items-center justify-between">
              <h4 className="text-sm font-bold text-thread-pine">
                In the Lounge ({filteredPresence.length})
              </h4>
              <button
                onClick={() => setShowMobilePresence(false)}
                className="text-thread-sage hover:text-thread-pine"
              >
                <PixelIcon name="close" size={20} />
              </button>
            </div>
            <div className="p-4 space-y-3"
              style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
            >
              {filteredPresence.map((p) => {
                const isMuted = mutedUsers.has(p.userId);
                const isCurrentUser = p.userId === user.id;
                return (
                  <div key={p.userId} className="flex items-center gap-3 p-2 rounded hover:bg-thread-cream/50">
                    {p.avatarUrl ? (
                      <img
                        src={p.avatarUrl}
                        alt={p.displayName || p.handle || 'User'}
                        className={`w-10 h-10 rounded-full border border-thread-sage ${isMuted ? 'opacity-40' : ''}`}
                      />
                    ) : (
                      <div className={`w-10 h-10 rounded-full bg-thread-stone border border-thread-sage flex items-center justify-center ${isMuted ? 'opacity-40' : ''}`}>
                        <span className="text-sm text-thread-paper">
                          {(p.displayName || p.handle || 'A')[0].toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <span
                        onClick={() => !isCurrentUser && p.handle && setSelectedUsername(p.handle.split('@')[0])}
                        className={`text-sm block truncate ${!isCurrentUser ? 'cursor-pointer hover:underline' : ''} ${isMuted ? 'text-thread-sage' : 'text-thread-pine'}`}
                      >
                        {p.displayName || p.handle}
                      </span>
                      {isMuted && (
                        <button
                          onClick={() => handleUnmuteUser(p.userId)}
                          className="text-xs text-thread-sunset hover:underline"
                        >
                          Unmute
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* User Profile Quick View Modal */}
      {selectedUsername && (
        <UserQuickView
          username={selectedUsername}
          isOpen={!!selectedUsername}
          onClose={() => setSelectedUsername(null)}
        />
      )}
    </div>
  );
}
