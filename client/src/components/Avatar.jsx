// Shared primitive: a circular avatar with a fallback initial when
// there's no avatarUrl, used by ConversationList, ConversationHeader,
// and MessageList so avatar styling lives in exactly one place.
export function Avatar({ username, avatarUrl, size = 8 }) {
  const dimension = `h-${size} w-${size}`;

  if (avatarUrl) {
    return <img src={avatarUrl} alt={username} className={`${dimension} rounded-full object-cover`} />;
  }

  return (
    <div className={`${dimension} rounded-full bg-blue-500 text-white flex items-center justify-center text-sm`}>
      {username?.[0]?.toUpperCase()}
    </div>
  );
}
