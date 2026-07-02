import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { User } from './useConversations';

export interface Message {
    id: string;
    conversationId: string;
    senderId: string;
    body: string;
    createdAt: string;
    isRead: boolean;
    handle?: string;
    displayName?: string;
    avatarUrl?: string;
    sender?: User;
}

export function useDirectMessages(conversationId: string | null) {
    const { user } = useCurrentUser();
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);
    const [socket, setSocket] = useState<Socket | null>(null);

    useEffect(() => {
        if (!user || !conversationId) {
            setMessages([]);
            setSocket(null);
            return;
        }

        // Guards against the previous conversation's late-resolving fetch
        // overwriting this conversation's messages, and against setState
        // after unmount.
        let cancelled = false;

        setMessages([]);
        setLoading(true);

        // Connect socket
        const newSocket = io(process.env.NEXT_PUBLIC_BASE_URL || '', {
            withCredentials: true,
        });

        newSocket.on('dm:new_message', (message: Message) => {
            if (cancelled) return;
            if (message.conversationId === conversationId) {
                setMessages(prev => [...prev, message]);
                // Mark as read
                newSocket.emit('dm:read', { conversationId });
            }
        });

        setSocket(newSocket);

        // Fetch messages
        fetch(`/api/messages/${conversationId}`)
            .then(res => {
                if (!res.ok) throw new Error(`Failed to fetch messages (${res.status})`);
                return res.json();
            })
            .then(data => {
                if (cancelled) return;
                setMessages(Array.isArray(data) ? data : []);
                setLoading(false);
                // Mark as read on load
                newSocket.emit('dm:read', { conversationId });
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
    }, [user, conversationId]);

    const sendMessage = (body: string, targetUserId: string) => {
        if (!socket || !conversationId) return;

        socket.emit('dm:send', {
            targetUserId,
            body
        });
    };

    return {
        messages,
        loading,
        sendMessage
    };
}
