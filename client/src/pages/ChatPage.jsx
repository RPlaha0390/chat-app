// The main app view: wires the tested components above together with
// live data from REST (initial load) and Socket.IO (everything after).
// Kept deliberately thin — all the real logic already lives in, and is
// tested in, the components and contexts it composes.
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { listConversations, getMessages, createConversation } from '../api/conversations';
import { listUsers } from '../api/users';
import { uploadFile } from '../api/upload';
import { ConversationList } from '../components/ConversationList';
import { ConversationHeader } from '../components/ConversationHeader';
import { MessageList } from '../components/MessageList';
import { MessageInput } from '../components/MessageInput';
import { TypingIndicator } from '../components/TypingIndicator';
import { NewConversationModal } from '../components/NewConversationModal';
import { LoadingDots } from '../components/LoadingDots';
import { Button } from '../components/Button';
import { ThemeToggle } from '../components/ThemeToggle';

export function ChatPage() {
  const { user, logout } = useAuth();
  const socket = useSocket();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [onlineUserIds, setOnlineUserIds] = useState(new Set());
  const [typingUserIds, setTypingUserIds] = useState(new Set());
  const [userOptions, setUserOptions] = useState([]);
  const [showNewConversationModal, setShowNewConversationModal] = useState(false);

  const activeConversation = conversations.find((c) => c._id === activeId) ?? null;

  // listConversations populates each member's isOnline, which is the only
  // way to know who was *already* online when this tab loaded —
  // presence:update only ever reports changes from here on. Applied as a
  // merge so a later refresh can't stomp deltas that arrived meanwhile.
  const applyConversations = useCallback((list) => {
    setConversations(list);
    setOnlineUserIds((prev) => {
      const next = new Set(prev);
      for (const conversation of list) {
        for (const member of conversation.members ?? []) {
          if (member.isOnline) next.add(member._id);
          else next.delete(member._id);
        }
      }
      return next;
    });
  }, []);

  useEffect(() => {
    listConversations()
      .then((data) => applyConversations(data.conversations))
      .finally(() => setIsLoadingConversations(false));
  }, [applyConversations]);

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

  const handleCreateConversation = useCallback(
    async ({ memberIds, isGroup, name }) => {
      const { conversation } = await createConversation({ memberIds, isGroup, name });
      // Re-fetch rather than locally appending: the new conversation's
      // members need to be populated the same way listConversations
      // already returns them (username/avatarUrl/isOnline/lastSeen), and
      // createConversation's response doesn't populate that.
      const { conversations: refreshed } = await listConversations();
      applyConversations(refreshed);
      setActiveId(conversation._id);
      setShowNewConversationModal(false);
    },
    [applyConversations]
  );

  useEffect(() => {
    if (!activeId) return;
    // Typing state is per-conversation and ephemeral — carrying it across
    // a switch would show whoever was mid-sentence in the old thread as
    // typing in the new one.
    setTypingUserIds(new Set());
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

    function handleTyping({ conversationId, userId, isTyping }) {
      // A socket can be in several conversation rooms at once, so a
      // typing event has to be matched to the thread on screen —
      // otherwise someone typing in another shared conversation shows up
      // as typing in this one.
      if (conversationId !== activeId) return;
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
    return () => {
      // Clear our typing flag first: once we've left the room the server
      // stops relaying our typing events, so a pending "stopped typing"
      // would never land and we'd stay stuck as "typing..." for everyone
      // else in the conversation we just walked away from.
      socket.emit('typing:stop', { conversationId: activeId });
      // Then leave, otherwise rooms accumulate for the life of the
      // connection and every conversation ever opened keeps pushing
      // events at this client.
      socket.emit('leave', { conversationId: activeId });
    };
  }, [socket, activeId]);

  const handleSend = useCallback(
    (text, attachmentUrl) => {
      if (!socket || !activeId) return;
      socket.emit('message:send', { conversationId: activeId, text, attachmentUrl });
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

  const handleLogout = useCallback(() => {
    // Clearing `user` also tears down the socket (SocketProvider keys off
    // it), so navigating afterwards lands on /login with no live
    // connection left behind.
    logout();
    navigate('/login', { replace: true });
  }, [logout, navigate]);

  const typingUsernames = activeConversation
    ? activeConversation.members
        .filter((m) => m._id !== user.id && typingUserIds.has(m._id))
        .map((m) => m.username)
    : [];

  return (
    <div className="flex h-screen bg-surface dark:bg-surface-dark">
      <aside className="w-72 border-r border-black/5 dark:border-white/5 overflow-y-auto flex flex-col">
        <div className="flex items-center justify-between gap-2 px-3 py-3">
          <span className="truncate font-display font-medium text-ink dark:text-ink-dark" title={user.username}>
            {user.username}
          </span>
          <div className="flex items-center gap-1 shrink-0">
            <ThemeToggle />
            <button
              onClick={handleLogout}
              className="text-sm text-ink/50 dark:text-ink-dark/50 hover:text-ink dark:hover:text-ink-dark px-2 py-1"
            >
              Log out
            </button>
          </div>
        </div>
        <Button onClick={() => setShowNewConversationModal(true)} className="mx-3 mb-3">
          New conversation
        </Button>
        {isLoadingConversations ? (
          <div className="flex items-center justify-center py-8 text-ink/40 dark:text-ink-dark/40">
            <LoadingDots />
          </div>
        ) : (
          <ConversationList
            conversations={conversations}
            currentUserId={user.id}
            onSelect={setActiveId}
            activeId={activeId}
            onlineUserIds={onlineUserIds}
          />
        )}
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
        {activeId && (
          <MessageInput onSend={handleSend} onTypingChange={handleTypingChange} onUpload={uploadFile} />
        )}
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
