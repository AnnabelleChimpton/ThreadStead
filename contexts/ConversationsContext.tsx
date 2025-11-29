import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useCurrentUser } from '@/hooks/useCurrentUser';

export interface User {
    id: string;
    primaryHandle: string | null;
    profile?: {
        displayName?: string | null;
        avatarThumbnailUrl?: string | null;
        avatarUrl?: string | null;
    };
}

export interface Conversation {
    id: string;
    updatedAt: string;
    otherUser: User;
    lastMessage?: {
        body: string;
        createdAt: string;
        senderId: string;
        isRead: boolean;
    };
    unreadCount: number;
}

interface Message {
    id: string;
    conversationId: string;
    senderId: string;
    body: string;
    createdAt: string;
    isRead: boolean;
}

interface ConversationsContextType {
    conversations: Conversation[];
    loading: boolean;
    createConversation: (targetUserId: string) => Promise<any>;
    markAsRead: (conversationId: string) => void;
    socket: Socket | null;
}

const ConversationsContext = createContext<ConversationsContextType | undefined>(undefined);

export function ConversationsProvider({ children }: { children: ReactNode }) {
    const { user } = useCurrentUser();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);
    const [socket, setSocket] = useState<Socket | null>(null);

    useEffect(() => {
        if (!user) {
            setLoading(false);
            setConversations([]);
            return;
        }

        // Connect socket
        const newSocket = io(process.env.NEXT_PUBLIC_BASE_URL || '', {
            withCredentials: true,
        });

        newSocket.on('dm:new_message', (message: Message) => {
            setConversations(prev => {
                const idx = prev.findIndex(c => c.id === message.conversationId);

                // If new conversation, we might need to fetch it or reload
                if (idx === -1) {
                    fetch('/api/messages/conversations')
                        .then(res => res.json())
                        .then(data => setConversations(data));
                    return prev;
                }

                const updated = { ...prev[idx] };
                updated.lastMessage = {
                    body: message.body,
                    createdAt: message.createdAt,
                    senderId: message.senderId,
                    isRead: false
                };
                updated.updatedAt = message.createdAt;

                // Increment unread count if message is from other user
                if (message.senderId === updated.otherUser.id) {
                    updated.unreadCount = (updated.unreadCount || 0) + 1;
                }

                // Move to top
                const newList = [...prev];
                newList.splice(idx, 1);
                return [updated, ...newList];
            });
        });

        setSocket(newSocket);

        // Initial fetch
        fetch('/api/messages/conversations')
            .then(res => res.json())
            .then(data => {
                setConversations(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });

        return () => {
            newSocket.disconnect();
        };
    }, [user]);

    const createConversation = async (targetUserId: string) => {
        const res = await fetch('/api/messages/conversations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ targetUserId })
        });
        const data = await res.json();

        // Refresh list
        const listRes = await fetch('/api/messages/conversations');
        const list = await listRes.json();
        setConversations(list);

        return data;
    };

    const markAsRead = (conversationId: string) => {
        setConversations(prev => prev.map(c => {
            if (c.id === conversationId) {
                return { ...c, unreadCount: 0 };
            }
            return c;
        }));
    };

    return (
        <ConversationsContext.Provider value={{
            conversations,
            loading,
            createConversation,
            markAsRead,
            socket
        }}>
            {children}
        </ConversationsContext.Provider>
    );
}

export function useConversationsContext() {
    const context = useContext(ConversationsContext);
    if (context === undefined) {
        throw new Error('useConversationsContext must be used within a ConversationsProvider');
    }
    return context;
}
