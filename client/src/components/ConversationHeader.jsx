export function ConversationHeader({ conversation, currentUserId, onlineUserIds }) {
  if (!conversation) return null;

  const other = !conversation.isGroup
    ? conversation.members.find((m) => m._id !== currentUserId)
    : null;

  const title = conversation.isGroup ? conversation.name : other?.username;
  const isOnline = other && onlineUserIds.has(other._id);

  return (
    <div className="border-b p-4">
      <h2 className="font-semibold">{title}</h2>
      {!conversation.isGroup && (
        <p className="text-xs text-gray-500">{isOnline ? 'Online' : 'Offline'}</p>
      )}
    </div>
  );
}
