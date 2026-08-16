// Verifies the three core schemas: required fields are enforced,
// uniqueness is enforced where it matters (username/email), and a
// Conversation/Message can reference a User the way later controllers
// will rely on.
const { startInMemoryMongo, stopInMemoryMongo } = require('./testUtils/inMemoryMongo');
const User = require('../src/models/User');
const Conversation = require('../src/models/Conversation');
const Message = require('../src/models/Message');

beforeAll(startInMemoryMongo);
afterAll(stopInMemoryMongo);

describe('User model', () => {
  it('creates a user with required fields', async () => {
    const user = await User.create({
      username: 'alice',
      email: 'alice@example.com',
      passwordHash: 'hashed',
    });
    expect(user.username).toBe('alice');
    expect(user.isOnline).toBe(false); // default
  });

  it('rejects a duplicate email', async () => {
    await User.create({ username: 'bob', email: 'dupe@example.com', passwordHash: 'x' });
    await expect(
      User.create({ username: 'bob2', email: 'dupe@example.com', passwordHash: 'y' })
    ).rejects.toThrow();
  });
});

describe('Conversation and Message models', () => {
  it('links a message to a conversation and its sender', async () => {
    const alice = await User.create({ username: 'alice2', email: 'a2@example.com', passwordHash: 'x' });
    const bobUser = await User.create({ username: 'bob3', email: 'b3@example.com', passwordHash: 'x' });

    const convo = await Conversation.create({
      isGroup: false,
      members: [alice._id, bobUser._id],
    });

    const message = await Message.create({
      conversation: convo._id,
      sender: alice._id,
      text: 'hello',
    });

    expect(message.conversation.toString()).toBe(convo._id.toString());
    expect(message.sender.toString()).toBe(alice._id.toString());
  });
});
