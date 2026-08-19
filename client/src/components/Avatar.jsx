// Shared primitive: a circular avatar with a fallback initial when
// there's no avatarUrl, used by ConversationList, ConversationHeader,
// and MessageList so avatar styling lives in exactly one place.
//
// Sizes are a fixed lookup rather than an interpolated `h-${size}` class
// — Tailwind only generates classes it can see literally in source, so a
// dynamic class name silently produces no CSS at all.
const SIZES = {
  6: 'h-6 w-6 text-xs',
  8: 'h-8 w-8 text-sm',
  10: 'h-10 w-10 text-base',
};

const DOT_OFFSET = {
  6: '-right-0.5 -bottom-0.5 h-2 w-2',
  8: '-right-0.5 -bottom-0.5 h-2.5 w-2.5',
  10: 'right-0 bottom-0 h-3 w-3',
};

export function Avatar({ username, avatarUrl, size = 8, isOnline }) {
  const dimension = SIZES[size] ?? SIZES[8];
  const showDot = typeof isOnline === 'boolean';

  return (
    <span className="relative inline-flex shrink-0">
      {avatarUrl ? (
        <img src={avatarUrl} alt={username} className={`${dimension} rounded-full object-cover`} />
      ) : (
        <span
          className={`${dimension} rounded-full bg-primary dark:bg-primary-dark text-white flex items-center justify-center font-display font-semibold`}
        >
          {username?.[0]?.toUpperCase()}
        </span>
      )}
      {showDot && (
        <span
          className={`absolute rounded-full ring-2 ring-surface dark:ring-surface-dark ${DOT_OFFSET[size] ?? DOT_OFFSET[8]} ${
            isOnline ? 'bg-online' : 'bg-ink/20 dark:bg-ink-dark/20'
          }`}
        />
      )}
    </span>
  );
}
