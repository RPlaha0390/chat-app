// Verifies the form calls AuthContext's login() with the entered
// values, and shows the server's error message on failure.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { LoginPage } from './LoginPage';
import { useAuth } from '../context/AuthContext';

vi.mock('../context/AuthContext', () => ({ useAuth: vi.fn() }));

describe('LoginPage', () => {
  it('calls login with the entered email and password', async () => {
    const login = vi.fn().mockResolvedValue(undefined);
    useAuth.mockReturnValue({ login });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );
    await userEvent.type(screen.getByLabelText(/email/i), 'alice@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'password123');
    await userEvent.click(screen.getByRole('button', { name: /log in/i }));

    expect(login).toHaveBeenCalledWith('alice@example.com', 'password123');
  });

  it('shows an error message when login fails', async () => {
    const login = vi.fn().mockRejectedValue(new Error('Invalid email or password'));
    useAuth.mockReturnValue({ login });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );
    await userEvent.type(screen.getByLabelText(/email/i), 'alice@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: /log in/i }));

    expect(await screen.findByText('Invalid email or password')).toBeInTheDocument();
  });
});
