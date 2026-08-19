import { LoadingDots } from './LoadingDots';

export function TypingIndicator({ typingUsernames }) {
  if (typingUsernames.length === 0) return null;
  return (
    <p className="flex items-center gap-2 text-xs font-mono text-ink/50 dark:text-ink-dark/50 px-4 pb-1">
      {typingUsernames.join(', ')} typing <LoadingDots />
    </p>
  );
}
