import { Avatar } from './Avatar';
import { resolveAssetUrl } from '../api/client';

export function MessageList({ messages, currentUserId, onLoadMore }) {
  function handleScroll(e) {
    if (e.target.scrollTop === 0) onLoadMore();
  }

  return (
    <div
      data-scroll-container
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto flex flex-col gap-2 p-4"
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
            <div className={`rounded-lg px-3 py-2 max-w-xs ${isOwn ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
              {message.attachment?.url && (
                <img
                  src={resolveAssetUrl(message.attachment.url)}
                  alt="attachment"
                  className="rounded mb-1 max-w-full"
                />
              )}
              {message.text}
            </div>
          </div>
        );
      })}
    </div>
  );
}
