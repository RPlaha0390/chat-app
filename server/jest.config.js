module.exports = {
  testEnvironment: 'node',
  // 30s: mongodb-memory-server downloads a Mongo binary on first run,
  // which can be slow — default 5s timeout would flake on a cold cache.
  testTimeout: 30000,
  // Exclude utility files from test discovery
  testPathIgnorePatterns: ['testUtils/'],
};
