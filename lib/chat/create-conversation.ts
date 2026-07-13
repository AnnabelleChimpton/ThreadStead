// Single source of truth for the "open/create a 1-on-1 conversation" request.
// Two contexts need it (ChatContext.openDM and ConversationsContext.create-
// Conversation) and provider nesting prevents one from consuming the other, so
// they share this helper instead of duplicating the fetch shape.

export interface ConversationResult {
  id: string;
  [key: string]: unknown;
}

export async function requestConversation(targetUserId: string): Promise<ConversationResult> {
  const res = await fetch('/api/messages/conversations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetUserId }),
  });
  if (!res.ok) {
    throw new Error(`Failed to create conversation (${res.status})`);
  }
  const data = await res.json();
  if (!data?.id) {
    throw new Error('Conversation response missing id');
  }
  return data;
}
