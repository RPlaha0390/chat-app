export function TypingIndicator({ typingUsernames }) {
  if (typingUsernames.length === 0) return null;
  return <p className="text-xs text-gray-500 px-4">{typingUsernames.join(', ')} typing...</p>;
}
