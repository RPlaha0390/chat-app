// Every REST call in the app goes through this so the Bearer token and
// error handling are handled in exactly one place, per the spec's
// "small api/ wrapper" decision.
const BASE_URL = import.meta.env.VITE_API_URL;

export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('token');

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    // Server always returns { message } on errors (see errorHandler.js),
    // so callers can show body.message directly to the user.
    throw new Error(body.message || 'Request failed');
  }

  return body;
}
