import { Avatar } from './Avatar';

function displayName(conversation, currentUserId) {
  if (conversation.isGroup) return conversation.name;
  const other = conversation.members.find((m) => m._id !== currentUserId);
  return other?.username ?? 'Unknown';
}

export function ConversationList({ conversations, currentUserId, onSelect, activeId, onlineUserIds }) {
  return (
    <ul className="flex flex-col">
      {conversations.map((conversation) => {
        const other = !conversation.isGroup
          ? conversation.members.find((m) => m._id !== currentUserId)
          : null;
        const isActive = conversation._id === activeId;
        const isOnline = other ? onlineUserIds?.has(other._id) : undefined;

        return (
          <li key={conversation._id}>
            <button
              onClick={() => onSelect(conversation._id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-left border-l-2 transition-colors ${
                isActive
                  ? 'border-primary dark:border-primary-dark bg-primary/5 dark:bg-primary-dark/10'
                  : 'border-transparent hover:bg-black/[0.03] dark:hover:bg-white/[0.03]'
              }`}
            >
              <Avatar username={other?.username ?? conversation.name} avatarUrl={other?.avatarUrl} isOnline={isOnline} />
              <span className="text-ink dark:text-ink-dark truncate">{displayName(conversation, currentUserId)}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
