// Verifies the three state transitions AuthContext is responsible for:
// starting logged-out, becoming logged-in after login(), and clearing
// state on logout(). Mocks apiFetch so this test doesn't need a real
// backend running.
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';

vi.mock('../api/client', () => ({
  apiFetch: vi.fn(),
}));
import { apiFetch } from '../api/client';

function TestConsumer() {
  const { user, isLoading, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="user">{user ? user.username : 'none'}</span>
      <span data-testid="loading">{isLoading ? 'loading' : 'ready'}</span>
      <button onClick={() => login('alice@example.com', 'password123')}>login</button>
      <button onClick={logout}>logout</button>
    </div>
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('AuthContext', () => {
  it('starts logged out when there is no stored token', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );
    expect(screen.getByTestId('user').textContent).toBe('none');
    // Nothing to check, so guards must not be left waiting.
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('ready'));
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('restores the user from a stored token on mount', async () => {
    localStorage.setItem('token', 'stored-token');
    apiFetch.mockResolvedValueOnce({ user: { username: 'alice' } });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    // Guards must see "still deciding" rather than "logged out" first.
    expect(screen.getByTestId('loading').textContent).toBe('loading');

    await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('alice'));
    expect(apiFetch).toHaveBeenCalledWith('/api/auth/me');
    expect(screen.getByTestId('loading').textContent).toBe('ready');
  });

  it('discards a stored token the server rejects', async () => {
    localStorage.setItem('token', 'expired-token');
    apiFetch.mockRejectedValueOnce(new Error('Invalid token'));

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('ready'));
    expect(screen.getByTestId('user').textContent).toBe('none');
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('sets the user and stores the token after a successful login', async () => {
    apiFetch.mockResolvedValueOnce({ user: { username: 'alice' }, token: 'fake-token' });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );
    await userEvent.click(screen.getByText('login'));

    await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('alice'));
    expect(localStorage.getItem('token')).toBe('fake-token');
  });

  it('clears user and token on logout', async () => {
    apiFetch.mockResolvedValueOnce({ user: { username: 'alice' }, token: 'fake-token' });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );
    await userEvent.click(screen.getByText('login'));
    await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('alice'));

    await userEvent.click(screen.getByText('logout'));
    expect(screen.getByTestId('user').textContent).toBe('none');
    expect(localStorage.getItem('token')).toBeNull();
  });
});
