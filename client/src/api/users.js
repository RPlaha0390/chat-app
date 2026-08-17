// Feeds NewConversationModal's user picker — separate file from
// conversations.js since it's a different resource, even though the
// wrapper shape is identical.
import { apiFetch } from './client';

export function listUsers() {
  return apiFetch('/api/users');
}
