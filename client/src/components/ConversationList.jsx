import { Avatar } from './Avatar';

function displayName(conversation, currentUserId) {
  if (conversation.isGroup) return conversation.name;
  const other = conversation.members.find((m) => m._id !== currentUserId);
  return other?.username ?? 'Unknown';
}

export function ConversationList({ conversations, currentUserId, onSelect }) {
  return (
    <ul className="flex flex-col divide-y">
      {conversations.map((conversation) => {
        const other = !conversation.isGroup
          ? conversation.members.find((m) => m._id !== currentUserId)
          : null;

        return (
          <li key={conversation._id}>
            <button
              onClick={() => onSelect(conversation._id)}
              className="w-full flex items-center gap-3 p-3 hover:bg-gray-100 text-left"
            >
              <Avatar username={other?.username ?? conversation.name} avatarUrl={other?.avatarUrl} />
              <span>{displayName(conversation, currentUserId)}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
