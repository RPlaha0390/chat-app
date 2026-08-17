// Named export (not default) to match how the test imports it and to
// keep every page's import style consistent across the app.
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-sm mx-auto mt-20 flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Log in</h1>

      <label className="flex flex-col gap-1">
        Email
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border rounded px-3 py-2"
          required
        />
      </label>

      <label className="flex flex-col gap-1">
        Password
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border rounded px-3 py-2"
          required
        />
      </label>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <button type="submit" className="bg-blue-600 text-white rounded px-3 py-2">
        Log in
      </button>

      <p className="text-sm">
        No account? <Link to="/register" className="text-blue-600">Register</Link>
      </p>
    </form>
  );
}
