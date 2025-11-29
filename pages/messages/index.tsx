import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import Layout from '@/components/ui/layout/Layout'; // Corrected path
import { PixelIcon } from '@/components/ui/PixelIcon';
import { formatDistanceToNow } from 'date-fns';
import { useConversations } from '@/hooks/useConversations';
import { useDirectMessages } from '@/hooks/useDirectMessages';

export default function MessagesPage() {
    const router = useRouter();
    const { user, loading: userLoading } = useCurrentUser();
    const { conversations, loading: listLoading, createConversation } = useConversations();
    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
    const [isMobileListVisible, setIsMobileListVisible] = useState(true);

    // Handle URL query for starting a chat
    useEffect(() => {
        const { start_chat } = router.query;
        if (start_chat && typeof start_chat === 'string' && user) {
            createConversation(start_chat).then(data => {
                if (data.id) {
                    setSelectedConversationId(data.id);
                    setIsMobileListVisible(false);
                }
            });
        }
    }, [router.query, user, createConversation]); // Added createConversation to dependency array

    const selectedConversation = conversations.find(c => c.id === selectedConversationId);

    if (userLoading) return <div className="p-8 text-center">Loading...</div>;
    if (!user) return <div className="p-8 text-center">Please log in to view messages.</div>;

    return (
        <Layout>
            <Head>
                <title>Messages | ThreadStead</title>
            </Head>

            <div className="max-w-6xl mx-auto p-4 h-[calc(100vh-80px)]">
                <div className="bg-thread-paper border border-thread-sage rounded-lg shadow-sm h-full flex overflow-hidden">

                    {/* Conversation List */}
                    <div className={`${isMobileListVisible ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-80 border-r border-thread-sage bg-thread-cream/30`}>
                        <div className="p-4 border-b border-thread-sage flex justify-between items-center bg-thread-cream">
                            <h2 className="font-bold text-thread-pine text-lg">Messages</h2>
                            <button className="text-thread-sage hover:text-thread-pine">
                                <PixelIcon name="plus" size={20} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {listLoading ? (
                                <div className="p-8 text-center text-thread-sage text-sm">Loading conversations...</div>
                            ) : conversations.length === 0 ? (
                                <div className="p-8 text-center text-thread-sage text-sm">
                                    No conversations yet.
                                </div>
                            ) : (
                                conversations.map(c => (
                                    <button
                                        key={c.id}
                                        onClick={() => {
                                            setSelectedConversationId(c.id);
                                            setIsMobileListVisible(false);
                                        }}
                                        className={`w-full text-left p-3 border-b border-thread-sage/50 hover:bg-white transition-colors flex items-center gap-3 ${selectedConversationId === c.id ? 'bg-white border-l-4 border-l-thread-pine' : ''}`}
                                    >
                                        <div className="w-10 h-10 rounded-full bg-thread-sage/20 overflow-hidden flex-shrink-0">
                                            {c.otherUser.profile?.avatarThumbnailUrl ? (
                                                <img src={c.otherUser.profile.avatarThumbnailUrl} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-thread-sage">
                                                    <PixelIcon name="user" size={20} />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-baseline">
                                                <span className="font-bold text-thread-charcoal truncate">
                                                    {c.otherUser.profile?.displayName || c.otherUser.primaryHandle}
                                                </span>
                                                {c.updatedAt && (
                                                    <span className="text-xs text-thread-sage flex-shrink-0 ml-2">
                                                        {formatDistanceToNow(new Date(c.updatedAt), { addSuffix: true })}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-thread-sage truncate">
                                                {c.lastMessage?.senderId === user.id ? 'You: ' : ''}
                                                {c.lastMessage?.body || 'No messages'}
                                            </p>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Chat Area */}
                    <div className={`${!isMobileListVisible ? 'flex' : 'hidden'} md:flex flex-col flex-1 bg-white`}>
                        {selectedConversation ? (
                            <ChatArea
                                conversationId={selectedConversation.id}
                                otherUser={selectedConversation.otherUser}
                                onBack={() => setIsMobileListVisible(true)}
                            />
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-thread-sage">
                                <PixelIcon name="chat" size={48} className="mb-4 opacity-50" />
                                <p>Select a conversation to start messaging</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    );
}

function ChatArea({ conversationId, otherUser, onBack }: { conversationId: string, otherUser: any, onBack: () => void }) {
    const { user } = useCurrentUser();
    const { messages, loading, sendMessage } = useDirectMessages(conversationId);
    const [inputText, setInputText] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputText.trim()) return;

        sendMessage(inputText, otherUser.id);
        setInputText('');
    };

    return (
        <>
            {/* Chat Header */}
            <div className="p-3 border-b border-thread-sage flex items-center gap-3 bg-thread-cream/50">
                <button
                    className="md:hidden text-thread-sage"
                    onClick={onBack}
                >
                    <PixelIcon name="arrow-left" size={20} />
                </button>
                <div className="w-8 h-8 rounded-full bg-thread-sage/20 overflow-hidden">
                    {otherUser.profile?.avatarThumbnailUrl && (
                        <img src={otherUser.profile.avatarThumbnailUrl} alt="" className="w-full h-full object-cover" />
                    )}
                </div>
                <div>
                    <h3 className="font-bold text-thread-charcoal">
                        {otherUser.profile?.displayName || otherUser.primaryHandle}
                    </h3>
                    <span className="text-xs text-thread-sage">@{otherUser.primaryHandle}</span>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-thread-paper">
                {loading ? (
                    <div className="p-8 text-center text-thread-sage text-sm">Loading messages...</div>
                ) : messages.map((msg, i) => {
                    const isMe = msg.senderId === user?.id;
                    const showAvatar = !isMe && (i === 0 || messages[i - 1].senderId !== msg.senderId);

                    return (
                        <div key={msg.id} className={`flex gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                            {!isMe && (
                                <div className="w-8 h-8 flex-shrink-0">
                                    {showAvatar && (
                                        <div className="w-8 h-8 rounded-full bg-thread-sage/20 overflow-hidden">
                                            {msg.sender?.profile?.avatarThumbnailUrl || otherUser.profile?.avatarThumbnailUrl ? (
                                                <img src={msg.sender?.profile?.avatarThumbnailUrl || otherUser.profile?.avatarThumbnailUrl || ''} alt="" className="w-full h-full object-cover" />
                                            ) : null}
                                        </div>
                                    )}
                                </div>
                            )}
                            <div className={`max-w-[70%] rounded-lg p-3 ${isMe
                                ? 'bg-thread-pine text-white rounded-tr-none'
                                : 'bg-thread-cream text-thread-charcoal rounded-tl-none'
                                }`}>
                                <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                                <div className={`text-[10px] mt-1 ${isMe ? 'text-white/70' : 'text-thread-sage'}`}>
                                    {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-thread-sage bg-white">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 border border-thread-sage rounded-full px-4 py-2 focus:outline-none focus:border-thread-pine"
                        maxLength={280}
                    />
                    <button
                        type="submit"
                        disabled={!inputText.trim()}
                        className="bg-thread-pine text-white rounded-full p-2 w-10 h-10 flex items-center justify-center hover:bg-thread-pine-dark disabled:opacity-50"
                    >
                        <PixelIcon name="arrow-right" size={20} />
                    </button>
                </div>
            </form>
        </>
    );
}
