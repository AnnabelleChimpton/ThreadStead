'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { csrfFetchJson } from '@/lib/api/client/csrf-fetch';
import { cleanAndNormalizeHtml } from '@/lib/utils/sanitization/html';
import { retroSFX } from '@/lib/audio/retro-sfx';
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

// Utility function to replace text smileys with pixel art (or unicode for now)
function processMessageContent(text: string): string {
  let processed = linkifyText(text);

  // Simple emoticon replacement
  const emoticons: Record<string, string> = {
    ':)': '&#128578;', // 🙂
    ':-)': '&#128578;',
    ':(': '&#128577;', // ☹️
    ':-(': '&#128577;',
    '<3': '&#10084;&#65039;', // ❤️
    ':D': '&#128515;', // 😃
    ':-D': '&#128515;',
    ';)': '&#128521;', // 😉
    ';-)': '&#128521;',
    ':P': '&#128539;', // 😛
    ':-P': '&#128539;',
    'lol': '&#129315;', // 🤣
  };

  // Replace emoticons (careful not to break HTML tags from linkify)
  Object.entries(emoticons).forEach(([key, value]) => {
    // Escape special regex chars
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Match only if not inside a tag (simple heuristic)
    const regex = new RegExp(`(?<!="[^"]*)${escapedKey}(?![^<]*>)`, 'g');
    processed = processed.replace(regex, `<span class="font-emoji text-lg align-middle">${value}</span>`);
  });

  return processed;
}

// Utility function to detect URLs and convert them to clickable links
function linkifyText(text: string): string {
  // URL detection regex - matches http(s):// URLs and www. URLs
  const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)/gi;

  return text.replace(urlRegex, (url) => {
    // Ensure the URL has a protocol
    const href = url.startsWith('http') ? url : `https://${url}`;

    return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="text-thread-pine underline hover:text-thread-sage transition-colors">${url}</a>`;
  });
}

interface CommunityChatPanelProps {
  fullscreen?: boolean;
  popupMode?: boolean;
  onClose?: () => void;
  onPresenceChange?: (presence: PresenceUser[], showPresence: boolean, togglePresence: () => void) => void;
}

export default function CommunityChatPanel({ fullscreen = false, popupMode = false, onClose, onPresenceChange }: CommunityChatPanelProps) {
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

  // Create stable toggle function
  const toggleMobilePresence = useCallback(() => {
    setShowMobilePresence(prev => !prev);
  }, []);

  // Expose presence info to parent
  useEffect(() => {
    if (onPresenceChange) {
      onPresenceChange(presence, showMobilePresence, toggleMobilePresence);
    }
  }, [presence, showMobilePresence, toggleMobilePresence, onPresenceChange]);
  // Default to expanded on fullscreen (/chat page), collapsed in popup
  const [presenceCollapsed, setPresenceCollapsed] = useState(!fullscreen);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [sfxEnabled, setSfxEnabled] = useState(true);

  const messageListRef = useRef<HTMLDivElement>(null);
  const hasLoadedInitialMessages = useRef(false);

  useEffect(() => {
    setSfxEnabled(retroSFX.isEnabled());
  }, []);

  const toggleSfx = () => {
    const newState = !sfxEnabled;
    setSfxEnabled(newState);
    retroSFX.setEnabled(newState);
  };

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
          hasLoadedInitialMessages.current = true;
        }

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

      // Play SFX for all messages (sent or received)
      retroSFX.playMessageOut();

      setTimeout(scrollToBottom, 100);
    });

    newSocket.on('chat:typing', (data: { userId: string, handle: string }) => {
      if (data.userId !== user.id) {
        setTypingUsers(prev => {
          const newSet = new Set(prev);
          newSet.add(data.handle || 'Someone');
          return newSet;
        });

        // Auto-clear after 3 seconds (failsafe)
        setTimeout(() => {
          setTypingUsers(prev => {
            const newSet = new Set(prev);
            newSet.delete(data.handle || 'Someone');
            return newSet;
          });
        }, 3000);
      }
    });

    newSocket.on('chat:stop_typing', (data: { userId: string }) => {
      // We'd need the handle to remove it from the Set<string> of handles.
      // Let's just rely on the auto-clear for now to keep it simple and robust.
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

  // Scroll to bottom on initial load and new real-time messages
  useEffect(() => {
    if (messages.length > 0) {
      // Longer delay to ensure popup animation completes (300ms + buffer)
      setTimeout(scrollToBottom, 350);
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

  const chatHeight = popupMode
    ? 'h-full'
    : fullscreen
      ? 'h-full'
      : 'h-[400px] sm:h-[500px] md:h-[600px]';

  // In popup mode, the wrapper handles border/shadow/rounding
  const containerClasses = popupMode
    ? `flex flex-col ${chatHeight} bg-thread-paper`
    : `flex flex-col ${chatHeight} bg-thread-paper border border-thread-sage rounded-lg shadow-[2px_2px_0_#A18463]`;

  return (
    <div className={containerClasses}>
      {/* Header - hidden in popup mode (popup wrapper has its own header) */}
      {!popupMode && (
        <div className="flex items-center justify-between px-3 py-2 border-b border-thread-sage bg-thread-cream">
          <div className="flex items-center gap-2">
            <PixelIcon name="chat" size={20} className="text-thread-pine" />
            <h3 className="text-sm font-bold text-thread-pine">Lounge</h3>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSfx}
              className={`text-thread-sage hover:text-thread-pine transition-colors p-1 ${!sfxEnabled ? 'opacity-50' : ''}`}
              title={sfxEnabled ? "Mute sound effects" : "Enable sound effects"}
            >
              <PixelIcon name="speaker" size={16} />
            </button>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${connected ? 'bg-thread-meadow' : 'bg-thread-stone'}`} />
              <span className="text-xs text-thread-sage hidden sm:inline">
                {connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            {!fullscreen && (
              <button
                onClick={() => setShowMobilePresence(!showMobilePresence)}
                className="md:hidden flex items-center gap-1.5 text-thread-sage hover:text-thread-pine transition-colors px-2 py-1 rounded-full bg-thread-sage/5 hover:bg-thread-sage/10 active:scale-95"
                title="Show participants"
              >
                <PixelIcon name="users" size={18} />
                <span className="text-xs font-medium text-thread-pine">{filteredPresence.length}</span>
                <PixelIcon name={showMobilePresence ? "chevron-down" : "chevron-up"} size={12} />
                <span className="sr-only">Toggle participants</span>
              </button>
            )}
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
      )}

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
            className="flex-1 overflow-y-auto p-2 space-y-1 retro-scrollbar"
            style={{ scrollbarWidth: 'auto' }}
          >
            {filteredMessages.map((msg, idx) => {
              const isOwnMessage = msg.userId === user.id;
              const isMuted = mutedUsers.has(msg.userId);
              return (
                <div
                  key={msg.id}
                  className={`group flex gap-2 p-2.5 sm:p-3 rounded ${isOwnMessage ? 'bg-thread-cream/50' : isMuted ? 'bg-thread-stone/10' : 'hover:bg-thread-paper'
                    }`}
                >
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    {msg.avatarUrl ? (
                      <img
                        src={msg.avatarUrl}
                        alt={getDisplayName(msg)}
                        className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-thread-sage ${isMuted ? 'opacity-40' : ''}`}
                      />
                    ) : (
                      <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-thread-stone border border-thread-sage flex items-center justify-center ${isMuted ? 'opacity-40' : ''}`}>
                        <span className="text-xs text-thread-paper">
                          {getDisplayName(msg)[0]?.toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Message Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-1.5">
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
                            className="text-thread-sage/50 hover:text-thread-pine text-xs px-1 opacity-0 group-hover:opacity-100 transition-opacity leading-none"
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
                    <div
                      className={`text-xs whitespace-pre-wrap break-words ${isMuted ? 'text-thread-sage/70 italic' : 'text-thread-charcoal'}`}
                      dangerouslySetInnerHTML={{
                        __html: isMuted
                          ? 'Message hidden (user muted)'
                          : cleanAndNormalizeHtml(processMessageContent(msg.body))
                      }}
                    />
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
                onChange={(e) => {
                  setMessageInput(e.target.value);
                  if (socket) {
                    socket.emit('chat:typing', { roomId: ROOM_ID });

                    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                    typingTimeoutRef.current = setTimeout(() => {
                      socket.emit('chat:stop_typing', { roomId: ROOM_ID });
                    }, 1000);
                  }
                }}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 text-xs border border-thread-sage rounded bg-white text-thread-charcoal resize-none min-h-[40px] sm:min-h-[36px]"
                rows={1}
                maxLength={280}
                disabled={!connected || sending}
                style={{ WebkitOverflowScrolling: 'touch' }}
              />
              <RetroButton
                onClick={handleSendMessage}
                loading={sending}
                disabled={!connected || !messageInput.trim() || sending}
                className="px-3 sm:px-4 self-end min-h-[40px] sm:min-h-[36px] min-w-[60px] sm:min-w-[80px]"
              >
                <span className="hidden sm:inline">Send</span>
                <span className="sm:hidden">→</span>
              </RetroButton>
            </div>
            <div className="flex justify-between items-center mt-1">
              <div className="text-xs text-thread-sage h-4">
                {typingUsers.size > 0 && (
                  <span className="animate-pulse">
                    {Array.from(typingUsers).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
                  </span>
                )}
              </div>
              <div className="text-xs text-thread-sage">
                {messageInput.length}/280
              </div>
            </div>
          </div>
        </div>

        {/* Presence Sidebar - Desktop */}
        <div className={`hidden md:flex flex-col border-l border-thread-sage bg-thread-cream transition-all duration-300 ${presenceCollapsed ? 'w-10' : 'w-48'}`}>
          {presenceCollapsed ? (
            // Collapsed view - only show expand button
            <div className="flex flex-col items-center py-2 gap-2">
              <button
                onClick={() => setPresenceCollapsed(false)}
                className="text-thread-sage hover:text-thread-pine transition-colors p-1.5 rounded hover:bg-thread-sage/10"
                title="Expand sidebar"
              >
                <PixelIcon name="chevron-left" size={16} />
              </button>
              <div className="text-[10px] font-bold text-thread-sage writing-vertical-rl rotate-180 tracking-widest uppercase opacity-70">
                Lounge
              </div>
            </div>
          ) : (
            // Expanded view
            <div className="flex flex-col h-full">
              {/* Header with collapse toggle */}
              <div className="flex items-center justify-between p-3 border-b border-thread-sage/20 bg-thread-sage/5">
                <h4 className="text-xs font-bold text-thread-pine uppercase tracking-wider">
                  Online ({filteredPresence.length})
                </h4>
                <button
                  onClick={() => setPresenceCollapsed(true)}
                  className="text-thread-sage hover:text-thread-pine transition-colors p-1 rounded hover:bg-thread-sage/10"
                  title="Collapse sidebar"
                >
                  <PixelIcon name="chevron-right" size={14} />
                </button>
              </div>

              {/* User list */}
              <div className="flex-1 overflow-y-auto p-2 space-y-1 retro-scrollbar" style={{ scrollbarWidth: 'thin' }}>
                {filteredPresence.map((p) => {
                  const isMuted = mutedUsers.has(p.userId);
                  const isCurrentUser = p.userId === user.id;
                  const displayName = p.displayName || p.handle || 'User';

                  return (
                    <div key={p.userId} className={`flex items-center gap-2 p-1.5 rounded transition-colors group ${isCurrentUser ? 'bg-thread-white/40' : 'hover:bg-thread-white/60'}`}>
                      {p.avatarUrl ? (
                        <img
                          src={p.avatarUrl}
                          alt={displayName}
                          className={`w-6 h-6 rounded-full border border-thread-sage/50 ${isMuted ? 'opacity-40' : ''}`}
                        />
                      ) : (
                        <div className={`w-6 h-6 rounded-full bg-thread-stone/20 border border-thread-sage/50 flex items-center justify-center ${isMuted ? 'opacity-40' : ''}`}>
                          <span className="text-[10px] text-thread-sage font-bold">
                            {displayName[0].toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <span
                          onClick={() => !isCurrentUser && p.handle && setSelectedUsername(p.handle.split('@')[0])}
                          className={`text-xs truncate font-medium ${!isCurrentUser ? 'cursor-pointer hover:text-thread-pine-dark' : ''} ${isMuted ? 'text-thread-sage' : 'text-thread-pine'}`}
                        >
                          {displayName}
                        </span>
                        {isMuted && (
                          <button
                            onClick={() => handleUnmuteUser(p.userId)}
                            className="text-[9px] text-thread-sunset hover:underline text-left"
                          >
                            Unmute
                          </button>
                        )}
                      </div>
                      {/* Status Dot (fake for now, could be real) */}
                      <div className="w-1.5 h-1.5 rounded-full bg-thread-meadow shadow-sm" title="Online" />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
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
