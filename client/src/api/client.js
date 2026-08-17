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

// Attachment URLs are stored server-relative (`/uploads/<file>`) so the
// stored value stays origin-independent — important for the Cloudinary
// swap the design spec anticipates. But the API lives on a different
// origin than the client in dev, so rendering that path directly in an
// <img src> would resolve it against the *client* origin and 404.
// Resolve it against the API origin at render time instead.
export function resolveAssetUrl(path) {
  if (!path) return path;
  // Already absolute (e.g. a future Cloudinary URL) — leave it alone.
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(path) || path.startsWith('//')) return path;
  // No configured API origin (e.g. same-origin deployment) — the
  // server-relative path is already correct.
  if (!BASE_URL) return path;
  return new URL(path, BASE_URL).href;
}
