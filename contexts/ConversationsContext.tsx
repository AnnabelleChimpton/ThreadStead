import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo, ReactNode } from 'react';
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

    // Mirror of `conversations` so socket handlers can check current state
    // without reading (or firing side-effects) from inside a setState updater.
    const conversationsRef = useRef<Conversation[]>(conversations);
    useEffect(() => {
        conversationsRef.current = conversations;
    }, [conversations]);

    // In-flight guard so a burst of messages for an unknown conversation
    // triggers only one list refetch at a time.
    const refetchInFlightRef = useRef(false);
    const refetchConversations = useCallback(async () => {
        if (refetchInFlightRef.current) return;
        refetchInFlightRef.current = true;
        try {
            const res = await fetch('/api/messages/conversations');
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) {
                    setConversations(data);
                }
            }
        } catch (err) {
            console.error('Failed to refetch conversations:', err);
        } finally {
            refetchInFlightRef.current = false;
        }
    }, []);

    useEffect(() => {
        if (!user) {
            setLoading(false);
            setConversations([]);
            return;
        }

        let cancelled = false;

        // Connect socket
        const newSocket = io(process.env.NEXT_PUBLIC_BASE_URL || '', {
            withCredentials: true,
        });

        newSocket.on('dm:new_message', (message: Message) => {
            if (cancelled) return;

            // If new conversation, refetch the list (side-effect kept outside
            // the setState updater so it cannot multi-fire).
            const exists = conversationsRef.current.some(c => c.id === message.conversationId);
            if (!exists) {
                refetchConversations();
                return;
            }

            setConversations(prev => {
                const idx = prev.findIndex(c => c.id === message.conversationId);
                if (idx === -1) return prev;

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
            .then(res => {
                if (!res.ok) throw new Error(`Failed to fetch conversations (${res.status})`);
                return res.json();
            })
            .then(data => {
                if (cancelled) return;
                setConversations(Array.isArray(data) ? data : []);
                setLoading(false);
            })
            .catch(err => {
                if (cancelled) return;
                console.error(err);
                setLoading(false);
            });

        return () => {
            cancelled = true;
            newSocket.disconnect();
        };
    }, [user, refetchConversations]);

    const createConversation = useCallback(async (targetUserId: string) => {
        const res = await fetch('/api/messages/conversations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ targetUserId })
        });
        if (!res.ok) {
            throw new Error(`Failed to create conversation (${res.status})`);
        }
        const data = await res.json();

        // Refresh list
        const listRes = await fetch('/api/messages/conversations');
        if (listRes.ok) {
            const list = await listRes.json();
            if (Array.isArray(list)) {
                setConversations(list);
            }
        }

        return data;
    }, []);

    const markAsRead = useCallback((conversationId: string) => {
        setConversations(prev => prev.map(c => {
            if (c.id === conversationId) {
                return { ...c, unreadCount: 0 };
            }
            return c;
        }));
    }, []);

    const value = useMemo(() => ({
        conversations,
        loading,
        createConversation,
        markAsRead,
        socket
    }), [conversations, loading, createConversation, markAsRead, socket]);

    return (
        <ConversationsContext.Provider value={value}>
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
