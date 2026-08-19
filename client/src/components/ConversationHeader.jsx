import { Avatar } from './Avatar';

export function ConversationHeader({ conversation, currentUserId, onlineUserIds }) {
  if (!conversation) return null;

  const other = !conversation.isGroup
    ? conversation.members.find((m) => m._id !== currentUserId)
    : null;

  const title = conversation.isGroup ? conversation.name : other?.username;
  const isOnline = other && onlineUserIds.has(other._id);

  return (
    <div className="flex items-center gap-3 border-b border-black/5 dark:border-white/5 px-4 py-3">
      <Avatar username={title} avatarUrl={other?.avatarUrl} isOnline={!conversation.isGroup ? isOnline : undefined} />
      <div>
        <h2 className="font-display font-semibold text-ink dark:text-ink-dark">{title}</h2>
        {!conversation.isGroup && (
          <p className="font-mono text-xs text-ink/50 dark:text-ink-dark/50">{isOnline ? 'Online' : 'Offline'}</p>
        )}
      </div>
    </div>
  );
}
