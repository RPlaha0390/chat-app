// Upload needs multipart/form-data, so it bypasses apiFetch's
// JSON-only Content-Type — but still attaches the same Bearer token.
const BASE_URL = import.meta.env.VITE_API_URL;

export async function uploadFile(file) {
  const token = localStorage.getItem('token');
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${BASE_URL}/api/upload`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.message || 'Upload failed');
  return body.url;
}
