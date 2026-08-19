import { Avatar } from './Avatar';
import { resolveAssetUrl } from '../api/client';

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function MessageList({ messages, currentUserId, onLoadMore }) {
  function handleScroll(e) {
    if (e.target.scrollTop === 0) onLoadMore();
  }

  return (
    <div
      data-scroll-container
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto flex flex-col gap-3 p-4"
    >
      {messages.map((message) => {
        const isOwn = message.sender._id === currentUserId;
        return (
          <div
            key={message._id}
            data-own={isOwn}
            className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse self-end' : 'self-start'}`}
          >
            <Avatar username={message.sender.username} avatarUrl={message.sender.avatarUrl} size={6} />
            <div className={`flex flex-col gap-1 ${isOwn ? 'items-end' : 'items-start'}`}>
              <div
                className={`px-3 py-2 max-w-xs break-words ${
                  isOwn
                    ? 'bg-primary dark:bg-primary-dark text-white rounded-2xl rounded-br-sm'
                    : 'bg-raised dark:bg-raised-dark text-ink dark:text-ink-dark rounded-2xl rounded-bl-sm'
                }`}
              >
                {message.attachment?.url && (
                  <img
                    src={resolveAssetUrl(message.attachment.url)}
                    alt="attachment"
                    className="rounded-lg mb-1 max-w-full"
                  />
                )}
                {message.text}
              </div>
              <span className="font-mono text-[11px] tabular-nums text-ink/40 dark:text-ink-dark/40 px-1">
                {formatTime(message.createdAt)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
