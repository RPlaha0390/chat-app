# Chat App — Design Spec

**Date:** 2026-08-16
**Status:** Approved, ready for implementation planning

## Summary

A real-time messaging app (1-on-1 DMs + group chats) built on the MERN
stack (MongoDB, Express, React, Node), styled with Tailwind CSS. Personal
learning project — prioritizes clarity and heavily-commented code over
production hardening, but built so it can be deployed later without a
rewrite.

## Goals

- 1-on-1 direct messages and group conversations
- Real user accounts (register/login) with custom JWT auth
- Message persistence and history (MongoDB)
- Online/offline presence
- Typing indicators
- Image/file attachments in messages
- Backend code and tests heavily commented, since the user is using this
  project to learn how the pieces work
- Deployable later (client and server as separate services) without
  re-architecting

## Non-Goals (v1)

- Auth0 / third-party auth provider — explicitly ruled out in favor of a
  hand-rolled JWT system, since owning the full auth flow is part of the
  learning goal
- Read receipts UI (schema supports it via `Message.readBy`, but no UI in v1)
- Cloud file storage (Cloudinary etc.) — v1 uses local disk; see
  "Future: Deployment" below for why this will need to change

## Architecture

Single Express HTTP server with Socket.IO attached to the same server
instance (shared port — avoids CORS-for-websockets complexity in local
dev). React client is a separate Vite app. Two channels between them:

- **REST** — anything needing a durable response/status code: auth,
  fetching conversation list/history, file upload.
- **Socket.IO** — anything live: new messages, typing indicators, presence.

```
chat-app/
├── client/                 # React + Vite + Tailwind
│   ├── src/
│   │   ├── api/            # REST client wrapper (attaches Bearer token)
│   │   ├── context/        # AuthContext, SocketContext
│   │   ├── components/
│   │   ├── pages/          # Login, Register, ChatPage
│   │   └── ...
│   └── ...
├── server/                 # Express + Mongoose + Socket.IO
│   ├── src/
│   │   ├── models/         # User, Conversation, Message
│   │   ├── routes/         # /auth, /conversations, /messages, /upload
│   │   ├── controllers/
│   │   ├── middleware/     # auth (JWT), error handler
│   │   ├── sockets/        # socket event handlers
│   │   ├── uploads/        # local disk storage for images (multer)
│   │   └── index.js        # Express app + HTTP server + Socket.IO attach
│   └── __tests__/          # Jest + Supertest (REST), socket.io-client (realtime)
└── README.md
```

`.env` files hold secrets server-side (Mongo URI, JWT secret); the client
reads the API base URL from a Vite env var (`VITE_API_URL`) so the client
build isn't hardcoded to `localhost` — this matters once client and
server deploy as separate services.

## Data Model

Three MongoDB collections via Mongoose.

**User**
```js
{
  _id,
  username: String (unique),
  email: String (unique),
  passwordHash: String,       // bcrypt
  avatarUrl: String,          // optional
  isOnline: Boolean,
  lastSeen: Date,
  createdAt
}
```

**Conversation** — a DM is modeled as a 2-member group; no separate
DM model needed.
```js
{
  _id,
  isGroup: Boolean,
  name: String,               // only used when isGroup — display name
  members: [ObjectId -> User],
  lastMessage: ObjectId -> Message,  // denormalized for fast list previews
  createdAt, updatedAt
}
```

**Message**
```js
{
  _id,
  conversation: ObjectId -> Conversation,
  sender: ObjectId -> User,
  text: String,
  attachment: { url: String, type: String },  // optional
  readBy: [ObjectId -> User],  // present now so read receipts can be
                                // added later without a schema migration
  createdAt
}
```

Indexes: `Message.conversation + createdAt` (paginated history fetch),
`Conversation.members` (fast "find my conversations" lookup).

## API

### REST endpoints

```
POST   /api/auth/register        { username, email, password } -> { user, token }
POST   /api/auth/login           { email, password } -> { user, token }
POST   /api/auth/logout          client-side token discard (no server session to clear)
GET    /api/auth/me              current user, from Bearer token (session check on app load)

GET    /api/conversations        list current user's conversations (with lastMessage preview)
POST   /api/conversations        create a DM or group { memberIds, isGroup, name? }
GET    /api/conversations/:id/messages?before=<messageId>   paginated history (30/page)

POST   /api/upload               multipart file upload -> { url }
```

### Socket.IO events

```
Client -> Server:
  "message:send"    { conversationId, text, attachmentUrl? }
  "typing:start"     { conversationId }
  "typing:stop"      { conversationId }

Server -> Client:
  "message:new"      broadcast to conversation room when anyone sends
  "typing:update"    { conversationId, userId, isTyping }
  "presence:update"  { userId, isOnline, lastSeen }
```

### Data flow

1. On login, client stores the returned JWT in `localStorage` and
   connects a Socket.IO client, passing the token via the `auth: { token }`
   handshake option. Server-side Socket.IO middleware verifies it before
   allowing the connection (mirrors the REST `requireAuth` middleware,
   same verification logic, different transport).
2. On opening a conversation, client emits a `join` for that
   conversation's Socket.IO room (room name = conversationId).
3. Sending a message: client emits `message:send`; server persists it
   through a shared controller function (not duplicated save logic),
   then broadcasts `message:new` to the room — including back to the
   sender, so there's a single source of truth for what's on screen.
4. Presence: on connect, mark the user online and broadcast
   `presence:update` to their conversations' members; on disconnect
   (with a short grace period to absorb page refreshes), mark offline
   and broadcast again.
5. History: REST-fetched on opening a conversation, paginated
   (load-more on scroll-to-top); anything after that arrives via socket.

## Auth

- Passwords hashed with bcrypt before storage.
- On login/register, server signs a JWT (user id payload) and returns
  it in the response body.
- Client stores the JWT in `localStorage`.
- REST: client attaches `Authorization: Bearer <token>` to every
  protected request; `requireAuth` Express middleware verifies it.
- Socket.IO: client passes the token via the `auth` field of the
  handshake; a Socket.IO middleware verifies it before the connection
  is accepted, using the same JWT-verification helper as `requireAuth`.
- Logout is client-side only (discard the stored token) — no server
  session to invalidate, consistent with stateless JWT auth.
- Tradeoff acknowledged: storing the JWT in `localStorage` (chosen by
  the user over an httpOnly cookie) is readable by JavaScript, so a
  successful XSS on the client could exfiltrate the token. Accepted
  for this project; worth reconsidering if this ever handles real user
  data in production.

## Error Handling

- **Server:** single Express error-handling middleware at the end of
  the middleware chain. Controllers `throw`/`next(err)` with a
  consistent `{ status, message }` shape so the client always gets
  predictable JSON, never a raw stack trace. Mongoose validation
  errors (e.g. duplicate email) are mapped to friendly 400s.
- **Client:** the API wrapper catches non-2xx responses and surfaces
  an inline/toast error (failed login, failed send, etc.). Socket
  disconnects show a "reconnecting..." banner; Socket.IO's built-in
  auto-reconnect handles the retry.
- **Uploads:** multer rejects non-image or over-size-limit files with
  a clear 400; the client also checks before sending the request, for
  faster feedback.

## Frontend Structure

- **Pages:** `LoginPage`, `RegisterPage`, `ChatPage` (sidebar
  conversation list + active conversation panel — single main view
  after login, no need for more routes at this scope).
- **Context providers:**
  - `AuthContext` — current user, login/logout/register actions;
    redirects to `/login` if there's no valid token on load.
  - `SocketContext` — owns the single Socket.IO connection (created
    after auth, torn down on logout), exposed to any component that
    needs to emit/listen.
- **Key components:** `ConversationList`, `ConversationHeader`
  (group name, or the other DM user + their online status),
  `MessageList` (scrollable, triggers "load more" on scroll-to-top),
  `MessageInput` (text + attachment picker; emits `typing:start`/
  `typing:stop` on keystroke, debounced), `TypingIndicator`,
  `NewConversationModal` (pick users to start a DM or group).
- **Styling:** Tailwind utility classes throughout; a couple of
  shared primitives (`Avatar`, `Button`) to avoid repeating class
  strings everywhere.
- **Data fetching:** small `api/` wrapper around `fetch` that attaches
  the Bearer token; conversation list and message history are
  REST-fetched on mount, everything else flows in over the socket
  into local state (`useReducer` per open conversation — no Redux
  needed at this scale).

## Testing

Pragmatic coverage, comments explaining *what's being verified* in
every test file (this is a learning project — the tests double as
documentation of expected behavior):

- **Backend:** Jest + Supertest against the REST API (register/login,
  conversation creation, message CRUD, auth rejection on missing/bad
  token), run against an in-memory MongoDB via
  `mongodb-memory-server` so tests never touch a real database.
- **Socket.IO:** integration tests using `socket.io-client` against a
  running test server instance — cover message send → broadcast, and
  connection rejection on a bad/missing token. Not every event needs
  a test; focus on the auth boundary and the core send/receive path.
- **Frontend:** Vitest + React Testing Library. Cover the components
  with real logic — `MessageInput` (typing events fire, debounce
  works, submit clears the field), `MessageList` (renders messages,
  triggers load-more), `AuthContext` (login/logout state transitions).
  Skip trivial presentational components.

## Deployment (future, not v1 work)

Client and server deploy as separate services (e.g. client to Vercel,
server to Render/Railway). Two things called out during design that
will need attention at that point, not now:

1. **File storage:** local disk storage doesn't survive redeploys/restarts
   on most free hosts. The upload code should sit behind a small,
   swappable interface so moving to Cloudinary later is a one-file
   change, not a rewrite.
2. **CORS:** the Express server will need CORS configured for the
   deployed client origin (both REST and the Socket.IO handshake).
