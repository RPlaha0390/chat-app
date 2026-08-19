// Covers the wiring ChatPage owns that no component test can see:
// seeding presence from the REST payload, scoping typing events to the
// conversation on screen, leaving a room on switch, and logging out.
// REST and socket are both faked so the test needs no backend.
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../api/conversations', () => ({
  listConversations: vi.fn(),
  getMessages: vi.fn(),
  createConversation: vi.fn(),
}));
vi.mock('../api/users', () => ({ listUsers: vi.fn() }));
vi.mock('../api/upload', () => ({ uploadFile: vi.fn() }));
vi.mock('../context/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../context/SocketContext', () => ({ useSocket: vi.fn() }));

import { listConversations, getMessages } from '../api/conversations';
import { listUsers } from '../api/users';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { ThemeProvider } from '../context/ThemeContext';
import { ChatPage } from './ChatPage';

const ME = { id: 'me', username: 'alice' };

// Two conversations that share a member (bob), which is exactly the
// situation where an unscoped typing event leaks between threads.
const CONVO_A = {
  _id: 'convoA',
  isGroup: false,
  members: [
    { _id: 'me', username: 'alice', isOnline: true },
    { _id: 'bob', username: 'bob', isOnline: true },
  ],
};
const CONVO_B = {
  _id: 'convoB',
  isGroup: false,
  members: [
    { _id: 'me', username: 'alice', isOnline: true },
    { _id: 'bob', username: 'bob', isOnline: true },
  ],
};

function createFakeSocket() {
  const handlers = new Map();
  return {
    emitted: [],
    on(event, fn) {
      handlers.set(event, [...(handlers.get(event) ?? []), fn]);
    },
    off(event, fn) {
      handlers.set(event, (handlers.get(event) ?? []).filter((h) => h !== fn));
    },
    emit(event, payload) {
      this.emitted.push({ event, payload });
    },
    // Simulates the server pushing an event down to this client.
    receive(event, payload) {
      act(() => {
        for (const fn of handlers.get(event) ?? []) fn(payload);
      });
    },
  };
}

let socket;
const logout = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  socket = createFakeSocket();
  useAuth.mockReturnValue({ user: ME, logout });
  useSocket.mockReturnValue(socket);
  listUsers.mockResolvedValue({ users: [] });
  getMessages.mockResolvedValue({ messages: [] });
  listConversations.mockResolvedValue({ conversations: [CONVO_A, CONVO_B] });
});

function renderChatPage() {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<ChatPage />} />
          <Route path="/login" element={<p>login page</p>} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>
  );
}

// Both conversations are DMs with bob, so the sidebar rows are
// indistinguishable by name — select them positionally.
async function openConversation(index) {
  const rows = await screen.findAllByRole('button', { name: /bob/i });
  await userEvent.click(rows[index]);
}

describe('ChatPage presence seeding', () => {
  it('shows a member who was already online before any presence event arrives', async () => {
    renderChatPage();

    await openConversation(0);

    // No presence:update has been received — this can only come from the
    // isOnline field on the listConversations payload.
    expect(await screen.findByText('Online')).toBeInTheDocument();
  });

  it('still applies live presence deltas on top of the seeded set', async () => {
    renderChatPage();
    await openConversation(0);
    await screen.findByText('Online');

    socket.receive('presence:update', { userId: 'bob', isOnline: false });

    expect(await screen.findByText('Offline')).toBeInTheDocument();
  });
});

describe('ChatPage typing events', () => {
  it('ignores a typing event for a different conversation', async () => {
    renderChatPage();
    await openConversation(0);

    socket.receive('typing:update', {
      conversationId: 'convoB',
      userId: 'bob',
      isTyping: true,
    });

    expect(screen.queryByText(/typing/i)).not.toBeInTheDocument();
  });

  it('shows a typing event for the active conversation', async () => {
    renderChatPage();
    await openConversation(0);

    socket.receive('typing:update', {
      conversationId: 'convoA',
      userId: 'bob',
      isTyping: true,
    });

    expect(await screen.findByText(/bob typing/i)).toBeInTheDocument();
  });
});

describe('ChatPage room membership', () => {
  it('leaves the previous conversation room when switching', async () => {
    renderChatPage();
    const [first, second] = await screen.findAllByRole('button', { name: /bob/i });

    await userEvent.click(first);
    await waitFor(() =>
      expect(socket.emitted).toContainEqual({ event: 'join', payload: { conversationId: 'convoA' } })
    );

    await userEvent.click(second);
    await waitFor(() =>
      expect(socket.emitted).toContainEqual({ event: 'leave', payload: { conversationId: 'convoA' } })
    );
    expect(socket.emitted).toContainEqual({ event: 'join', payload: { conversationId: 'convoB' } });
  });

  it('stops typing in the old room before leaving it', async () => {
    renderChatPage();
    const [first, second] = await screen.findAllByRole('button', { name: /bob/i });

    await userEvent.click(first);
    await userEvent.click(second);

    const events = socket.emitted.map((e) => `${e.event}:${e.payload.conversationId}`);
    // Order matters — the server only relays typing for rooms we're in.
    expect(events.indexOf('typing:stop:convoA')).toBeGreaterThan(-1);
    expect(events.indexOf('typing:stop:convoA')).toBeLessThan(events.indexOf('leave:convoA'));
  });
});

describe('ChatPage logout', () => {
  it('clears the session and sends the user to /login', async () => {
    renderChatPage();

    await userEvent.click(await screen.findByRole('button', { name: /log out/i }));

    expect(logout).toHaveBeenCalled();
    expect(await screen.findByText('login page')).toBeInTheDocument();
  });
});
