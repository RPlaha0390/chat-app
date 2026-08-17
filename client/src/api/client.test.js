// resolveAssetUrl is the one thing standing between a server-relative
// attachment path and a broken <img> — it resolves against the API
// origin, not the page's own origin.
import { describe, it, expect } from 'vitest';
import { resolveAssetUrl } from './client';

describe('resolveAssetUrl', () => {
  it('resolves a server-relative upload path against the API origin', () => {
    expect(resolveAssetUrl('/uploads/123-cat.png')).toBe(
      'http://localhost:5000/uploads/123-cat.png'
    );
  });

  it('leaves an already-absolute URL untouched', () => {
    const absolute = 'https://res.cloudinary.com/demo/image/upload/cat.png';
    expect(resolveAssetUrl(absolute)).toBe(absolute);
  });

  it('passes through empty values unchanged', () => {
    expect(resolveAssetUrl('')).toBe('');
    expect(resolveAssetUrl(undefined)).toBeUndefined();
    expect(resolveAssetUrl(null)).toBeNull();
  });
});
