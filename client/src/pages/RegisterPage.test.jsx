// Same shape as LoginPage's test, but for the three-field register form.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { RegisterPage } from './RegisterPage';
import { useAuth } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';

vi.mock('../context/AuthContext', () => ({ useAuth: vi.fn() }));

describe('RegisterPage', () => {
  it('calls register with the entered username, email, and password', async () => {
    const register = vi.fn().mockResolvedValue(undefined);
    useAuth.mockReturnValue({ register });

    render(
      <ThemeProvider>
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      </ThemeProvider>
    );
    await userEvent.type(screen.getByLabelText(/username/i), 'alice');
    await userEvent.type(screen.getByLabelText(/email/i), 'alice@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'password123');
    await userEvent.click(screen.getByRole('button', { name: /register/i }));

    expect(register).toHaveBeenCalledWith('alice', 'alice@example.com', 'password123');
  });

  it('shows an error message when registration fails', async () => {
    const register = vi.fn().mockRejectedValue(new Error('Email already registered'));
    useAuth.mockReturnValue({ register });

    render(
      <ThemeProvider>
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      </ThemeProvider>
    );
    await userEvent.type(screen.getByLabelText(/username/i), 'alice');
    await userEvent.type(screen.getByLabelText(/email/i), 'dupe@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'password123');
    await userEvent.click(screen.getByRole('button', { name: /register/i }));

    expect(await screen.findByText('Email already registered')).toBeInTheDocument();
  });
});
