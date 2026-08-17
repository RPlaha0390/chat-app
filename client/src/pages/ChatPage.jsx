// The main app view: wires the tested components above together with
// live data from REST (initial load) and Socket.IO (everything after).
// Kept deliberately thin — all the real logic already lives in, and is
// tested in, the components and contexts it composes.
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { listConversations, getMessages, createConversation } from '../api/conversations';
import { listUsers } from '../api/users';
import { ConversationList } from '../components/ConversationList';
import { ConversationHeader } from '../components/ConversationHeader';
import { MessageList } from '../components/MessageList';
import { MessageInput } from '../components/MessageInput';
import { TypingIndicator } from '../components/TypingIndicator';
import { NewConversationModal } from '../components/NewConversationModal';

export function ChatPage() {
  const { user } = useAuth();
  const socket = useSocket();

  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [onlineUserIds, setOnlineUserIds] = useState(new Set());
  const [typingUserIds, setTypingUserIds] = useState(new Set());
  const [userOptions, setUserOptions] = useState([]);
  const [showNewConversationModal, setShowNewConversationModal] = useState(false);

  const activeConversation = conversations.find((c) => c._id === activeId) ?? null;

  useEffect(() => {
    listConversations().then((data) => setConversations(data.conversations));
  }, []);

  // Loaded once so the "New conversation" picker has options ready the
  // moment it opens, rather than fetching on every open.
  useEffect(() => {
    // GET /api/users returns { id, username, avatarUrl } (userController's
    // toPublicUser-style mapping), but NewConversationModal and the rest
    // of this page work with `_id` to match every other populated user
    // shape in the app (conversation.members, message.sender). Normalize
    // at this one boundary rather than special-casing `id` vs `_id`
    // inside NewConversationModal.
    listUsers().then((data) =>
      setUserOptions(data.users.map((u) => ({ ...u, _id: u.id })))
    );
  }, []);

  const handleCreateConversation = useCallback(async ({ memberIds, isGroup, name }) => {
    const { conversation } = await createConversation({ memberIds, isGroup, name });
    // Re-fetch rather than locally appending: the new conversation's
    // members need to be populated the same way listConversations
    // already returns them (username/avatarUrl/isOnline/lastSeen), and
    // createConversation's response doesn't populate that.
    const { conversations: refreshed } = await listConversations();
    setConversations(refreshed);
    setActiveId(conversation._id);
    setShowNewConversationModal(false);
  }, []);

  useEffect(() => {
    if (!activeId) return;
    getMessages(activeId).then((data) => setMessages(data.messages.reverse()));
  }, [activeId]);

  useEffect(() => {
    if (!socket) return;

    function handleNewMessage(message) {
      if (message.conversation === activeId) {
        setMessages((prev) => [...prev, message]);
      }
    }

    function handlePresence({ userId, isOnline }) {
      setOnlineUserIds((prev) => {
        const next = new Set(prev);
        isOnline ? next.add(userId) : next.delete(userId);
        return next;
      });
    }

    function handleTyping({ userId, isTyping }) {
      setTypingUserIds((prev) => {
        const next = new Set(prev);
        isTyping ? next.add(userId) : next.delete(userId);
        return next;
      });
    }

    socket.on('message:new', handleNewMessage);
    socket.on('presence:update', handlePresence);
    socket.on('typing:update', handleTyping);

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('presence:update', handlePresence);
      socket.off('typing:update', handleTyping);
    };
  }, [socket, activeId]);

  useEffect(() => {
    if (!socket || !activeId) return;
    socket.emit('join', { conversationId: activeId });
  }, [socket, activeId]);

  const handleSend = useCallback(
    (text) => {
      if (!socket || !activeId) return;
      socket.emit('message:send', { conversationId: activeId, text });
    },
    [socket, activeId]
  );

  const handleTypingChange = useCallback(
    (isTyping) => {
      if (!socket || !activeId) return;
      socket.emit(isTyping ? 'typing:start' : 'typing:stop', { conversationId: activeId });
    },
    [socket, activeId]
  );

  const typingUsernames = activeConversation
    ? activeConversation.members
        .filter((m) => m._id !== user.id && typingUserIds.has(m._id))
        .map((m) => m.username)
    : [];

  return (
    <div className="flex h-screen">
      <aside className="w-72 border-r overflow-y-auto flex flex-col">
        <button
          onClick={() => setShowNewConversationModal(true)}
          className="m-2 bg-blue-600 text-white rounded px-3 py-2"
        >
          New conversation
        </button>
        <ConversationList
          conversations={conversations}
          currentUserId={user.id}
          onSelect={setActiveId}
        />
      </aside>

      <main className="flex-1 flex flex-col">
        <ConversationHeader
          conversation={activeConversation}
          currentUserId={user.id}
          onlineUserIds={onlineUserIds}
        />
        <MessageList
          messages={messages}
          currentUserId={user.id}
          onLoadMore={() => {
            if (!activeId || messages.length === 0) return;
            getMessages(activeId, messages[0]._id).then((data) =>
              setMessages((prev) => [...data.messages.reverse(), ...prev])
            );
          }}
        />
        <TypingIndicator typingUsernames={typingUsernames} />
        {activeId && <MessageInput onSend={handleSend} onTypingChange={handleTypingChange} />}
      </main>

      {showNewConversationModal && (
        <NewConversationModal
          userOptions={userOptions}
          onCreate={handleCreateConversation}
          onClose={() => setShowNewConversationModal(false)}
        />
      )}
    </div>
  );
}
