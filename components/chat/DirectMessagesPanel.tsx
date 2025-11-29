import React, { useState, useEffect, useRef } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useConversations } from '@/hooks/useConversations';
import { useDirectMessages } from '@/hooks/useDirectMessages';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { formatDistanceToNow } from 'date-fns';
import RetroButton from '@/components/ui/feedback/RetroButton';
import EmojiPicker from '@/components/ui/feedback/EmojiPicker';
import { useEmojis, Emoji } from '@/hooks/useEmojis';
import { cleanAndNormalizeHtml } from '@/lib/utils/sanitization/html';

interface DirectMessagesPanelProps {
    onClose?: () => void;
    initialConversationId?: string | null;
}

export default function DirectMessagesPanel({ onClose, initialConversationId }: DirectMessagesPanelProps) {
    const { user } = useCurrentUser();
    const { conversations, loading: listLoading, createConversation, markAsRead } = useConversations();
    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(initialConversationId || null);

    // Update selected conversation if initialConversationId changes
    useEffect(() => {
        if (initialConversationId) {
            setSelectedConversationId(initialConversationId);
        }
    }, [initialConversationId]);

    // Mark as read when conversation is selected or receives new messages while open
    useEffect(() => {
        if (selectedConversationId) {
            const conv = conversations.find(c => c.id === selectedConversationId);
            if (conv && conv.unreadCount > 0) {
                markAsRead(selectedConversationId);
            }
        }
    }, [selectedConversationId, conversations, markAsRead]);

    // If a conversation is selected, we render the chat view
    if (selectedConversationId) {
        return (
            <DirectMessageChat
                conversationId={selectedConversationId}
                onBack={() => setSelectedConversationId(null)}
                conversations={conversations}
            />
        );
    }

    // Otherwise render the list
    return (
        <div className="flex flex-col h-full bg-thread-paper">
            {/* Header */}
            <div className="p-3 border-b border-thread-sage bg-thread-cream flex justify-between items-center">
                <h3 className="font-bold text-thread-pine text-sm">Messages</h3>
                {/* Placeholder for "New Message" button - could implement a user search later */}
                <button className="text-thread-sage hover:text-thread-pine" title="New Message">
                    <PixelIcon name="plus" size={16} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto">
                {listLoading ? (
                    <div className="p-4 text-center text-thread-sage text-xs">Loading...</div>
                ) : conversations.length === 0 ? (
                    <div className="p-8 text-center text-thread-sage text-xs">
                        No conversations yet.
                    </div>
                ) : (
                    conversations.map(c => {
                        const avatarUrl = c.otherUser.profile?.avatarThumbnailUrl || c.otherUser.profile?.avatarUrl;

                        return (
                            <button
                                key={c.id}
                                onClick={() => setSelectedConversationId(c.id)}
                                className="w-full text-left p-3 border-b border-thread-sage/50 hover:bg-white transition-colors flex items-center gap-3"
                            >
                                <div className="w-8 h-8 rounded-full bg-thread-sage/20 overflow-hidden flex-shrink-0 border border-thread-sage">
                                    {avatarUrl ? (
                                        <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-thread-sage">
                                            <PixelIcon name="user" size={16} />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-baseline">
                                        <span className="font-bold text-thread-charcoal text-sm truncate">
                                            {c.otherUser.profile?.displayName || c.otherUser.primaryHandle}
                                        </span>
                                        {c.updatedAt && (
                                            <span className="text-[10px] text-thread-sage flex-shrink-0 ml-2">
                                                {formatDistanceToNow(new Date(c.updatedAt), { addSuffix: true })}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-thread-sage truncate">
                                        {c.lastMessage?.senderId === user?.id ? 'You: ' : ''}
                                        {c.lastMessage?.body || 'No messages'}
                                    </p>
                                </div>
                            </button>
                        );
                    })
                )}
            </div>
        </div>
    );
}



// Utility function to detect URLs and convert them to clickable links
function linkifyText(text: string): string {
    // URL detection regex - matches http(s):// URLs and www. URLs
    const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)/gi;

    return text.replace(urlRegex, (url) => {
        // Ensure URL has protocol
        const href = url.startsWith('www.') ? `http://${url}` : url;
        return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="text-thread-pine hover:underline break-all">${url}</a>`;
    });
}

function processMessageContent(text: string, customEmojis: Emoji[] = []): string {
    let processed = linkifyText(text);

    // Custom emoji replacement
    if (customEmojis.length > 0) {
        customEmojis.forEach(emoji => {
            const escapedName = emoji.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`:${escapedName}:`, 'g');
            processed = processed.replace(regex, `<img src="${emoji.imageUrl}" alt=":${emoji.name}:" class="inline-block w-5 h-5 align-middle object-contain" title=":${emoji.name}:" />`);
        });
    }

    return processed;
}

function DirectMessageChat({ conversationId, onBack, conversations }: { conversationId: string, onBack: () => void, conversations: any[] }) {
    const { user } = useCurrentUser();
    const { messages, loading, sendMessage } = useDirectMessages(conversationId);
    const [inputText, setInputText] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { emojis: customEmojis } = useEmojis();

    const conversation = conversations.find(c => c.id === conversationId);
    const otherUser = conversation?.otherUser;

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (inputText.trim() && otherUser) {
                sendMessage(inputText, otherUser.id);
                setInputText('');
            }
        }
    };

    const handleSendMessage = () => {
        if (inputText.trim() && otherUser) {
            sendMessage(inputText, otherUser.id);
            setInputText('');
        }
    };

    return (
        <div className="flex flex-col h-full bg-thread-paper">
            {/* Header */}
            <div className="p-2 border-b border-thread-sage bg-thread-cream flex items-center gap-2">
                <button onClick={onBack} className="text-thread-sage hover:text-thread-pine p-3 -ml-2" title="Back">
                    <PixelIcon name="arrow-left" size={16} />
                </button>
                <div className="w-8 h-8 rounded-full bg-thread-sage/20 overflow-hidden border border-thread-sage flex-shrink-0">
                    {otherUser?.profile?.avatarThumbnailUrl || otherUser?.profile?.avatarUrl ? (
                        <img src={otherUser.profile.avatarThumbnailUrl || otherUser.profile.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-thread-sage">
                            <PixelIcon name="user" size={16} />
                        </div>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-thread-charcoal text-sm truncate">
                        {otherUser?.profile?.displayName || otherUser?.primaryHandle}
                    </h3>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1 retro-scrollbar" style={{ scrollbarWidth: 'auto' }}>
                {loading && <div className="text-center text-xs text-thread-sage">Loading...</div>}
                {messages.map((msg, i) => {
                    const isMe = msg.senderId === user?.id;
                    const showDateSeparator = i === 0 || new Date(msg.createdAt).getDate() !== new Date(messages[i - 1].createdAt).getDate();

                    // Handle both API (nested) and Socket (flattened) data shapes
                    // Prioritize thumbnail, then full url, then socket flattened url
                    const avatarUrl = msg.sender?.profile?.avatarThumbnailUrl || msg.sender?.profile?.avatarUrl || msg.avatarUrl;
                    const displayName = msg.sender?.profile?.displayName || msg.displayName || msg.sender?.primaryHandle || msg.handle || (isMe ? 'You' : 'Unknown');

                    return (
                        <div key={msg.id + '_wrapper'}>
                            {showDateSeparator && (
                                <div className="flex items-center justify-center my-4">
                                    <div className="bg-thread-sage/20 px-3 py-1 rounded-full text-xs text-thread-sage font-medium">
                                        {new Date(msg.createdAt).toLocaleDateString()}
                                    </div>
                                </div>
                            )}
                            <div className={`group flex gap-2 p-2.5 sm:p-3 rounded ${isMe ? 'bg-thread-cream/50' : 'hover:bg-thread-paper'}`}>
                                {/* Avatar */}
                                <div className="flex-shrink-0">
                                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-thread-sage/20 overflow-hidden border border-thread-sage">
                                        {avatarUrl ? (
                                            <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-thread-sage">
                                                <PixelIcon name="user" size={16} />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-baseline gap-1.5">
                                        <span className={`font-semibold text-sm ${isMe ? 'text-thread-pine' : 'text-thread-charcoal'}`}>
                                            {displayName}
                                        </span>
                                        <span className="text-xs text-thread-sage/70">
                                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <div className="text-sm sm:text-xs whitespace-pre-wrap break-words text-thread-charcoal mt-0.5"
                                        dangerouslySetInnerHTML={{ __html: cleanAndNormalizeHtml(processMessageContent(msg.body, customEmojis)) }}
                                    />
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t border-thread-sage p-2 sm:p-3"
                style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom, 0px))' }}
            >
                <div className="flex gap-2 items-end">
                    <div className="pb-1">
                        <EmojiPicker
                            onEmojiSelect={(emojiName) => setInputText(prev => `${prev}:${emojiName}: `)}
                            className="z-20"
                        />
                    </div>
                    <textarea
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a message..."
                        className="flex-1 px-3 py-2 text-[16px] sm:text-xs border border-thread-sage rounded bg-white text-thread-charcoal resize-none min-h-[40px] sm:min-h-[36px]"
                        rows={1}
                        maxLength={280}
                        style={{ WebkitOverflowScrolling: 'touch' }}
                    />
                    <RetroButton
                        onClick={handleSendMessage}
                        disabled={!inputText.trim()}
                        className="px-3 sm:px-4 self-end min-h-[40px] sm:min-h-[36px] min-w-[60px] sm:min-w-[80px]"
                    >
                        <span className="hidden sm:inline">Send</span>
                        <span className="sm:hidden">→</span>
                    </RetroButton>
                </div>
                <div className="flex justify-end items-center mt-1">
                    <div className="text-xs text-thread-sage">
                        {inputText.length}/280
                    </div>
                </div>
            </div>
        </div>
    );
}
