// RequireAuth is the piece that decides whether a page refresh keeps you
// signed in. It must not answer "logged out" while AuthContext is still
// checking the stored token.
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('./context/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('./context/SocketContext', () => ({ SocketProvider: ({ children }) => children }));

import { useAuth } from './context/AuthContext';
import { RequireAuth } from './App';

beforeEach(() => vi.clearAllMocks());

function renderGuard() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route
          path="/"
          element={
            <RequireAuth>
              <p>protected</p>
            </RequireAuth>
          }
        />
        <Route path="/login" element={<p>login page</p>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('RequireAuth', () => {
  it('waits instead of redirecting while the session is being restored', () => {
    useAuth.mockReturnValue({ user: null, isLoading: true });
    renderGuard();

    expect(screen.queryByText('login page')).not.toBeInTheDocument();
    expect(screen.queryByText('protected')).not.toBeInTheDocument();
  });

  it('renders the protected page once a restored user arrives', () => {
    useAuth.mockReturnValue({ user: { id: 'u1' }, isLoading: false });
    renderGuard();

    expect(screen.getByText('protected')).toBeInTheDocument();
  });

  it('redirects to /login when the check finishes with no user', () => {
    useAuth.mockReturnValue({ user: null, isLoading: false });
    renderGuard();

    expect(screen.getByText('login page')).toBeInTheDocument();
  });
});
