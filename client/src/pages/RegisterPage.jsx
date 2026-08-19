import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/Button';
import { ThemeToggle } from '../components/ThemeToggle';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await register(username, email, password);
      navigate('/');
    } catch (err) {
      setError(err.message);
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-sm flex flex-col gap-4">
        <h1 className="font-display text-2xl font-semibold text-ink dark:text-ink-dark">Register</h1>

        <label className="flex flex-col gap-1 text-sm text-ink/70 dark:text-ink-dark/70">
          Username
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="border border-black/10 dark:border-white/10 bg-raised dark:bg-raised-dark rounded-lg px-3 py-2 text-ink dark:text-ink-dark focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-primary-dark"
            required
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-ink/70 dark:text-ink-dark/70">
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border border-black/10 dark:border-white/10 bg-raised dark:bg-raised-dark rounded-lg px-3 py-2 text-ink dark:text-ink-dark focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-primary-dark"
            required
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-ink/70 dark:text-ink-dark/70">
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border border-black/10 dark:border-white/10 bg-raised dark:bg-raised-dark rounded-lg px-3 py-2 text-ink dark:text-ink-dark focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-primary-dark"
            required
          />
        </label>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <Button type="submit" loading={isSubmitting} className="w-full">
          Register
        </Button>

        <p className="text-sm text-ink/60 dark:text-ink-dark/60">
          Already have an account?{' '}
          <Link to="/login" className="text-primary dark:text-primary-dark font-medium">
            Log in
          </Link>
        </p>
      </form>
    </div>
  );
}
