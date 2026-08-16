// Sets env vars the test process needs without depending on a
// developer's local .env file (which is gitignored) — keeps
// app.js side-effect-free per Task 1's design, and works
// identically on a fresh clone or in CI with no extra setup.
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-do-not-use-in-production';
