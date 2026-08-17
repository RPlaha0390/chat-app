// Thin wrappers over apiFetch for the conversation/message REST calls,
// so components call named functions instead of building URLs inline.
import { apiFetch } from './client';

export function listConversations() {
  return apiFetch('/api/conversations');
}

export function createConversation({ memberIds, isGroup, name }) {
  return apiFetch('/api/conversations', {
    method: 'POST',
    body: JSON.stringify({ memberIds, isGroup, name }),
  });
}

export function getMessages(conversationId, before) {
  const query = before ? `?before=${before}` : '';
  return apiFetch(`/api/conversations/${conversationId}/messages${query}`);
}
