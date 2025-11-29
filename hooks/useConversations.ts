import { useConversationsContext } from '@/contexts/ConversationsContext';
export type { User, Conversation } from '@/contexts/ConversationsContext';

export function useConversations() {
    return useConversationsContext();
}
