// OpenAPI 3 spec for the Netbook API — served at /api/openapi.json and
// rendered by Swagger UI at /api/docs.
const id = { type: 'string', description: 'MongoDB ObjectId' }
const err = (desc) => ({
  description: desc,
  content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
})
const ok = (desc, schema) => ({
  description: desc,
  content: { 'application/json': { schema } },
})
const jsonBody = (schema, required = true) => ({
  required,
  content: { 'application/json': { schema } },
})
const post = (over = {}) => ({
  type: 'object',
  properties: {
    id, text: { type: 'string' }, displayName: { type: 'string' }, photoURL: { type: 'string' },
    imageURL: { type: 'string' }, videoURL: { type: 'string' }, background: { type: 'string', nullable: true },
    likes: { type: 'array', items: id }, reactions: { type: 'object', additionalProperties: { type: 'string' } },
    commentCount: { type: 'integer' }, shareCount: { type: 'integer' },
    hashtags: { type: 'array', items: { type: 'string' } },
    visibility: { type: 'string', enum: ['public', 'followers', 'closefriends', 'onlyme'] },
    createdAt: { type: 'string', format: 'date-time' },
    ...over,
  },
})
const postList = { type: 'object', properties: { posts: { type: 'array', items: post() } } }

export const openapiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Netbook API',
    version: '1.0.0',
    description: `Full-stack social network API — posts, stories, reels, friends, realtime chat, notifications.

**Auth:** httpOnly JWT cookies (15-min access + 30-day refresh). Use \`POST /auth/register\` or \`/auth/login\`, then cookies are sent automatically (\`withCredentials\`).

**Realtime:** Socket.io on the same origin — handshake auth via \`GET /auth/socket-token\` or the cookie.

**Feed cursor:** opaque — pass back the \`cursor\` from the previous response verbatim.`,
  },
  servers: [{ url: '/api' }],
  components: {
    schemas: {
      Error: { type: 'object', properties: { message: { type: 'string' } } },
      Post: post(),
      User: {
        type: 'object',
        properties: {
          uid: id, displayName: { type: 'string' }, searchName: { type: 'string' },
          email: { type: 'string' }, photoURL: { type: 'string' }, coverURL: { type: 'string' },
          bio: { type: 'string' }, verified: { type: 'boolean' }, isPrivate: { type: 'boolean' },
          friends: { type: 'array', items: id }, followers: { type: 'array', items: id },
          following: { type: 'array', items: id }, savedPosts: { type: 'array', items: id },
        },
      },
      Notification: {
        type: 'object',
        properties: {
          id, type: { type: 'string', enum: ['like', 'comment', 'reply', 'follow', 'friend_request', 'friend_accept', 'share', 'mention'] },
          senderName: { type: 'string' }, senderPhoto: { type: 'string' }, postId: id, postText: { type: 'string' },
          read: { type: 'boolean' }, createdAt: { type: 'integer' },
        },
      },
      Message: {
        type: 'object',
        properties: {
          id, conversation: id, senderId: id, text: { type: 'string' },
          enc: { type: 'object', nullable: true, description: '{v,iv,ct} AES-256-GCM ciphertext in E2EE rooms' },
          read: { type: 'array', items: id }, reactions: { type: 'object' }, createdAt: { type: 'integer' },
        },
      },
      Conversation: {
        type: 'object',
        properties: {
          id, isGroup: { type: 'boolean' }, name: { type: 'string' }, theme: { type: 'string' },
          e2ee: { type: 'boolean' }, participants: { type: 'array', items: id },
          participantInfo: { type: 'object' }, lastMessage: { type: 'string' },
          lastMessageAt: { type: 'integer' }, unreadCounts: { type: 'object' },
        },
      },
      Story: {
        type: 'object',
        properties: { id, imageURL: { type: 'string' }, displayName: { type: 'string' }, photoURL: { type: 'string' }, expiresAt: { type: 'integer' }, viewedBy: { type: 'array', items: { type: 'object' } } },
      },
    },
  },
  paths: {
    '/health': {
      get: { tags: ['meta'], summary: 'Liveness + dependency status', responses: { 200: ok('Server health', { type: 'object' }) } },
    },
    '/metrics': {
      get: { tags: ['meta'], summary: 'Prometheus metrics (token-gated if METRICS_TOKEN set)', responses: { 200: { description: 'text/plain metrics' } } },
    },
    '/auth/register': {
      post: {
        tags: ['auth'], summary: 'Create account', security: [],
        requestBody: jsonBody({ type: 'object', required: ['displayName', 'email', 'password'], properties: { displayName: { type: 'string' }, email: { type: 'string' }, password: { type: 'string', minLength: 6 }, dob: { type: 'string' }, gender: { type: 'string' } } }),
        responses: { 201: ok('Created — sets auth cookies; devCode only when SMTP is off in dev', { type: 'object' }), 409: err('Email already registered') },
      },
    },
    '/auth/login': {
      post: {
        tags: ['auth'], summary: 'Log in', security: [],
        requestBody: jsonBody({ type: 'object', required: ['email', 'password'], properties: { email: { type: 'string' }, password: { type: 'string' } } }),
        responses: { 200: ok('Logged in — sets auth cookies', { type: 'object' }), 401: err('Invalid credentials') },
      },
    },
    '/auth/logout': { post: { tags: ['auth'], summary: 'Log out — clears cookies + refresh hash', responses: { 200: ok('Done', { type: 'object' }) } } },
    '/auth/refresh': { post: { tags: ['auth'], summary: 'Rotate tokens (refresh cookie only)', security: [], responses: { 200: ok('New cookie pair', { type: 'object' }), 401: err('Invalid refresh token') } } },
    '/auth/me': { get: { tags: ['auth'], summary: 'Current session user', responses: { 200: ok('User', { type: 'object' }), 401: err('Not authenticated') } } },
    '/auth/socket-token': { get: { tags: ['auth'], summary: 'Short-lived token for socket handshake', responses: { 200: ok('{ token }', { type: 'object' }) } } },
    '/auth/google': {
      post: { tags: ['auth'], summary: 'Google sign-in (ID token)', security: [], requestBody: jsonBody({ type: 'object', properties: { credential: { type: 'string' } } }), responses: { 200: ok('User', { type: 'object' }), 401: err('Verification failed') } },
    },
    '/auth/send-verify-code': { post: { tags: ['auth'], summary: 'Email a 6-digit verification code', responses: { 200: ok('{ sent }', { type: 'object' }) } } },
    '/auth/verify-email': { post: { tags: ['auth'], summary: 'Verify email with code', requestBody: jsonBody({ type: 'object', properties: { code: { type: 'string' } } }), responses: { 200: ok('Verified', { type: 'object' }), 400: err('Wrong/expired code') } } },
    '/auth/forgot': { post: { tags: ['auth'], summary: 'Email a password-reset code', security: [], requestBody: jsonBody({ type: 'object', properties: { email: { type: 'string' } } }), responses: { 200: ok('Always 200 (no email enumeration)', { type: 'object' }) } } },
    '/auth/reset': { post: { tags: ['auth'], summary: 'Reset password with code', security: [], requestBody: jsonBody({ type: 'object', properties: { email: { type: 'string' }, code: { type: 'string' }, password: { type: 'string' } } }), responses: { 200: ok('Updated', { type: 'object' }), 400: err('Wrong/expired code') } } },

    '/posts': {
      get: {
        tags: ['posts'], summary: 'Ranked feed — opaque cursor pagination',
        parameters: [{ name: 'cursor', in: 'query', schema: { type: 'string' }, description: 'Pass back verbatim' }],
        responses: { 200: ok('{ posts, hasMore, cursor }', { type: 'object' }) },
      },
      post: {
        tags: ['posts'], summary: 'Create post',
        requestBody: jsonBody({ type: 'object', required: ['text'], properties: { text: { type: 'string', maxLength: 2000 }, imageURL: { type: 'string' }, videoURL: { type: 'string' }, background: { type: 'string' }, visibility: { type: 'string', enum: ['public', 'followers', 'closefriends', 'onlyme'] } } }),
        responses: { 201: ok('{ post }', { type: 'object' }) },
      },
    },
    '/posts/search': { get: { tags: ['posts'], summary: 'Keyword search over post terms', parameters: [{ name: 'q', in: 'query', required: true, schema: { type: 'string' } }], responses: { 200: ok('Posts', postList) } } },
    '/posts/semantic': { get: { tags: ['posts'], summary: 'AI semantic search — meaning-level match over post embeddings (Atlas $vectorSearch or in-app cosine)', parameters: [{ name: 'q', in: 'query', required: true, schema: { type: 'string' } }], responses: { 200: ok('Posts ranked by similarity', postList) } } },
    '/posts/batch': { post: { tags: ['posts'], summary: 'Fetch posts by id list (Saved page)', requestBody: jsonBody({ type: 'object', properties: { ids: { type: 'array', items: id } } }), responses: { 200: ok('Posts', postList) } } },
    '/posts/reels': { get: { tags: ['posts'], summary: 'Video posts for the reels feed', responses: { 200: ok('Posts', postList) } } },
    '/posts/explore': { get: { tags: ['posts'], summary: 'Engagement-ranked media grid', responses: { 200: ok('Posts', postList) } } },
    '/posts/tag/{tag}': { get: { tags: ['posts'], summary: 'Posts under a hashtag', parameters: [{ name: 'tag', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: ok('Posts', postList) } } },
    '/posts/user/{userId}': { get: { tags: ['posts'], summary: "A user's posts (403 when account is private)", parameters: [{ name: 'userId', in: 'path', required: true, schema: id }], responses: { 200: ok('Posts', postList), 403: err('Private account') } } },
    '/posts/{id}': {
      get: { tags: ['posts'], summary: 'Single post', parameters: [{ name: 'id', in: 'path', required: true, schema: id }], responses: { 200: ok('{ post }', { type: 'object' }), 404: err('Not found') } },
      patch: { tags: ['posts'], summary: 'Edit post (owner)', parameters: [{ name: 'id', in: 'path', required: true, schema: id }], requestBody: jsonBody({ type: 'object', properties: { text: { type: 'string' }, visibility: { type: 'string' } } }), responses: { 200: ok('{ post }', { type: 'object' }), 403: err('Not yours') } },
      delete: { tags: ['posts'], summary: 'Delete post — cascades comments/notifications/reports', parameters: [{ name: 'id', in: 'path', required: true, schema: id }], responses: { 200: ok('{ deleted }', { type: 'object' }), 403: err('Not yours') } },
    },
    '/posts/{id}/reaction': {
      put: { tags: ['posts'], summary: 'Set reaction', parameters: [{ name: 'id', in: 'path', required: true, schema: id }], requestBody: jsonBody({ type: 'object', properties: { reaction: { type: 'string', enum: ['like', 'love', 'haha', 'wow', 'sad', 'angry'] } } }), responses: { 200: ok('{ post }', { type: 'object' }) } },
      delete: { tags: ['posts'], summary: 'Remove reaction', parameters: [{ name: 'id', in: 'path', required: true, schema: id }], responses: { 200: ok('{ post }', { type: 'object' }) } },
    },
    '/posts/{id}/share': { post: { tags: ['posts'], summary: 'Share with caption — embeds frozen snapshot', parameters: [{ name: 'id', in: 'path', required: true, schema: id }], requestBody: jsonBody({ type: 'object', properties: { caption: { type: 'string' } } }, false), responses: { 201: ok('{ post }', { type: 'object' }) } } },
    '/posts/{id}/report': { post: { tags: ['posts'], summary: 'Report — auto-hides at 3 reports', parameters: [{ name: 'id', in: 'path', required: true, schema: id }], requestBody: jsonBody({ type: 'object', properties: { reason: { type: 'string' } } }, false), responses: { 200: ok('{ reportCount, hidden }', { type: 'object' }) } } },

    '/comments/{postId}': {
      get: { tags: ['comments'], summary: 'Comments for a post', parameters: [{ name: 'postId', in: 'path', required: true, schema: id }], responses: { 200: ok('{ comments }', { type: 'object' }) } },
      post: { tags: ['comments'], summary: 'Add comment/reply', parameters: [{ name: 'postId', in: 'path', required: true, schema: id }], requestBody: jsonBody({ type: 'object', properties: { text: { type: 'string' }, imageURL: { type: 'string' }, parentCommentId: id } }), responses: { 201: ok('{ comment }', { type: 'object' }) } },
    },
    '/comments/{id}/like': { put: { tags: ['comments'], summary: 'Toggle comment like', parameters: [{ name: 'id', in: 'path', required: true, schema: id }], responses: { 200: ok('{ comment }', { type: 'object' }) } } },

    '/users/search': { get: { tags: ['users'], summary: 'People search (name prefix)', parameters: [{ name: 'q', in: 'query', required: true, schema: { type: 'string' } }], responses: { 200: ok('{ users }', { type: 'object' }) } } },
    '/users/suggested': { get: { tags: ['users'], summary: 'Friend suggestions', responses: { 200: ok('{ users }', { type: 'object' }) } } },
    '/users/basic': { get: { tags: ['users'], summary: 'Name/photo/E2EE-key for id list', parameters: [{ name: 'ids', in: 'query', required: true, schema: { type: 'string' } }], responses: { 200: ok('{ users }', { type: 'object' }) } } },
    '/users/me': { patch: { tags: ['users'], summary: 'Update profile', requestBody: jsonBody({ type: 'object', properties: { displayName: { type: 'string' }, bio: { type: 'string' }, photoURL: { type: 'string' }, coverURL: { type: 'string' }, isPrivate: { type: 'boolean' } } }), responses: { 200: ok('{ user }', { type: 'object' }) } } },
    '/users/me/e2ee-key': { put: { tags: ['users'], summary: 'Publish ECDH P-256 public JWK for E2EE DMs', requestBody: jsonBody({ type: 'object', properties: { jwk: { type: 'object' } } }), responses: { 200: ok('{ ok }', { type: 'object' }) } } },
    '/users/me/push-subscription': {
      post: { tags: ['users'], summary: 'Register a Web Push subscription', requestBody: jsonBody({ type: 'object', properties: { subscription: { type: 'object' } } }), responses: { 200: ok('{ ok }', { type: 'object' }) } },
      delete: { tags: ['users'], summary: 'Remove a push subscription', requestBody: jsonBody({ type: 'object', properties: { endpoint: { type: 'string' } } }), responses: { 200: ok('{ ok }', { type: 'object' }) } },
    },
    '/users/me/saved/{postId}': { put: { tags: ['users'], summary: 'Toggle saved post', parameters: [{ name: 'postId', in: 'path', required: true, schema: id }], responses: { 200: ok('{ savedPosts }', { type: 'object' }) } } },
    '/users/me/close-friends/{uid}': { put: { tags: ['users'], summary: 'Toggle close friend', parameters: [{ name: 'uid', in: 'path', required: true, schema: id }], responses: { 200: ok('{ closeFriends }', { type: 'object' }) } } },
    '/users/me/search-history': { post: { tags: ['users'], summary: 'Record a search term', requestBody: jsonBody({ type: 'object', properties: { term: { type: 'string' } } }), responses: { 200: ok('{ searchHistory }', { type: 'object' }) } } },
    '/users/me/search-history/{term}': { delete: { tags: ['users'], summary: 'Remove a search term', parameters: [{ name: 'term', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: ok('{ searchHistory }', { type: 'object' }) } } },
    '/users/{id}': { get: { tags: ['users'], summary: 'Profile (canView flag enforces privacy)', parameters: [{ name: 'id', in: 'path', required: true, schema: id }], responses: { 200: ok('{ user }', { type: 'object' }), 404: err('Not found') } } },

    '/friends': { get: { tags: ['friends'], summary: 'Requests (in/out) + friends list', responses: { 200: ok('{ received, sent, friends }', { type: 'object' }) } } },
    '/friends/status/{userId}': { get: { tags: ['friends'], summary: 'none | sent | received | friends', parameters: [{ name: 'userId', in: 'path', required: true, schema: id }], responses: { 200: ok('{ status }', { type: 'object' }) } } },
    '/friends/request/{userId}': {
      post: { tags: ['friends'], summary: 'Send friend request', parameters: [{ name: 'userId', in: 'path', required: true, schema: id }], responses: { 201: ok('{ requestId }', { type: 'object' }), 409: err('Already pending') } },
    },
    '/friends/request/{requestId}': { delete: { tags: ['friends'], summary: 'Cancel/decline a request', parameters: [{ name: 'requestId', in: 'path', required: true, schema: id }], responses: { 200: ok('{ deleted }', { type: 'object' }) } } },
    '/friends/accept/{requestId}': { post: { tags: ['friends'], summary: 'Accept — adds both sides atomically', parameters: [{ name: 'requestId', in: 'path', required: true, schema: id }], responses: { 200: ok('{ friendId }', { type: 'object' }), 403: err('Recipient only') } } },
    '/friends/{userId}': { delete: { tags: ['friends'], summary: 'Unfriend (both sides)', parameters: [{ name: 'userId', in: 'path', required: true, schema: id }], responses: { 200: ok('{ removed }', { type: 'object' }) } } },

    '/chat/conversations': {
      get: { tags: ['chat'], summary: 'My conversations, newest activity first', responses: { 200: ok('{ conversations }', { type: 'object' }) } },
      post: { tags: ['chat'], summary: 'Get-or-create DM (friends only)', requestBody: jsonBody({ type: 'object', properties: { otherUserId: id } }), responses: { 200: ok('{ conversationId }', { type: 'object' }), 403: err('Friends only') } },
    },
    '/chat/groups': { post: { tags: ['chat'], summary: 'Create group', requestBody: jsonBody({ type: 'object', properties: { name: { type: 'string' }, memberIds: { type: 'array', items: id } } }), responses: { 201: ok('{ conversation }', { type: 'object' }) } } },
    '/chat/conversations/{id}': { patch: { tags: ['chat'], summary: 'Theme / name / group permissions', parameters: [{ name: 'id', in: 'path', required: true, schema: id }], requestBody: jsonBody({ type: 'object' }), responses: { 200: ok('{ conversation }', { type: 'object' }) } } },
    '/chat/conversations/{id}/e2ee': { put: { tags: ['chat'], summary: 'Enable E2EE on a DM — one-way, both sides need published keys', parameters: [{ name: 'id', in: 'path', required: true, schema: id }], responses: { 200: ok('{ conversation }', { type: 'object' }), 409: err('Peer has no key yet') } } },
    '/chat/conversations/{id}/members/{uid}': {
      put: { tags: ['chat'], summary: 'Add member (respects whoCanAddMembers)', parameters: [{ name: 'id', in: 'path', required: true, schema: id }, { name: 'uid', in: 'path', required: true, schema: id }], responses: { 200: ok('{ conversation }', { type: 'object' }) } },
      delete: { tags: ['chat'], summary: 'Remove member / leave', parameters: [{ name: 'id', in: 'path', required: true, schema: id }, { name: 'uid', in: 'path', required: true, schema: id }], responses: { 200: ok('{ conversation }', { type: 'object' }) } },
    },
    '/chat/conversations/{id}/admins/{uid}': {
      put: { tags: ['chat'], summary: 'Promote to admin', parameters: [{ name: 'id', in: 'path', required: true, schema: id }, { name: 'uid', in: 'path', required: true, schema: id }], responses: { 200: ok('{ conversation }', { type: 'object' }) } },
      delete: { tags: ['chat'], summary: 'Demote admin (not the last one)', parameters: [{ name: 'id', in: 'path', required: true, schema: id }, { name: 'uid', in: 'path', required: true, schema: id }], responses: { 200: ok('{ conversation }', { type: 'object' }) } },
    },
    '/chat/conversations/{id}/messages': {
      get: { tags: ['chat'], summary: 'Message history (200 newest)', parameters: [{ name: 'id', in: 'path', required: true, schema: id }], responses: { 200: ok('{ messages }', { type: 'object' }) } },
      post: {
        tags: ['chat'], summary: 'Send message — {text} or {enc:{iv,ct}} in E2EE rooms',
        parameters: [{ name: 'id', in: 'path', required: true, schema: id }],
        requestBody: jsonBody({ type: 'object', properties: { text: { type: 'string' }, enc: { type: 'object', properties: { iv: { type: 'string' }, ct: { type: 'string' } } } } }),
        responses: { 201: ok('{ message }', { type: 'object' }), 400: err('Ciphertext required in E2EE room') },
      },
    },
    '/chat/conversations/{id}/read': { post: { tags: ['chat'], summary: 'Mark read — clears unread + ✓✓ receipts', parameters: [{ name: 'id', in: 'path', required: true, schema: id }], responses: { 200: ok('{ ok }', { type: 'object' }) } } },
    '/chat/messages/{id}': { delete: { tags: ['chat'], summary: 'Unsend for everyone (sender only)', parameters: [{ name: 'id', in: 'path', required: true, schema: id }], responses: { 200: ok('{ deleted }', { type: 'object' }) } } },
    '/chat/messages/{id}/react': { put: { tags: ['chat'], summary: 'Toggle emoji reaction on a message', parameters: [{ name: 'id', in: 'path', required: true, schema: id }], requestBody: jsonBody({ type: 'object', properties: { emoji: { type: 'string' } } }), responses: { 200: ok('{ message }', { type: 'object' }) } } },

    '/notifications': { get: { tags: ['notifications'], summary: 'My 50 newest', responses: { 200: ok('{ notifications }', { type: 'object' }) } } },
    '/notifications/push-key': { get: { tags: ['notifications'], summary: 'VAPID public key + whether push is enabled', responses: { 200: ok('{ enabled, publicKey }', { type: 'object' }) } } },
    '/notifications/read-all': { put: { tags: ['notifications'], summary: 'Mark all read', responses: { 200: ok('{ ok }', { type: 'object' }) } } },
    '/notifications/{id}/read': { put: { tags: ['notifications'], summary: 'Mark one read', parameters: [{ name: 'id', in: 'path', required: true, schema: id }], responses: { 200: ok('{ ok }', { type: 'object' }) } } },

    '/stories': {
      get: { tags: ['stories'], summary: 'Active stories grouped by user (privacy-filtered)', responses: { 200: ok('{ stories }', { type: 'object' }) } },
      post: { tags: ['stories'], summary: 'Post a story — TTL index expires it in 24h', requestBody: jsonBody({ type: 'object', properties: { imageURL: { type: 'string' }, audience: { type: 'string' } } }), responses: { 201: ok('{ story }', { type: 'object' }) } },
    },
    '/stories/archive': { get: { tags: ['stories'], summary: 'My expired stories (for highlights)', responses: { 200: ok('{ stories }', { type: 'object' }) } } },
    '/stories/{id}': { delete: { tags: ['stories'], summary: 'Delete my story', parameters: [{ name: 'id', in: 'path', required: true, schema: id }], responses: { 200: ok('{ deleted }', { type: 'object' }) } } },
    '/stories/{id}/view': { post: { tags: ['stories'], summary: 'Record a view (viewers list)', parameters: [{ name: 'id', in: 'path', required: true, schema: id }], responses: { 200: ok('{ ok }', { type: 'object' }) } } },

    '/highlights/user/{userId}': { get: { tags: ['highlights'], summary: "A user's highlight collections", parameters: [{ name: 'userId', in: 'path', required: true, schema: id }], responses: { 200: ok('{ highlights }', { type: 'object' }) } } },
    '/highlights': { post: { tags: ['highlights'], summary: 'Create a highlight from archived stories', requestBody: jsonBody({ type: 'object', properties: { name: { type: 'string' }, storyIds: { type: 'array', items: id }, coverURL: { type: 'string' } } }), responses: { 201: ok('{ highlight }', { type: 'object' }) } } },
    '/highlights/{id}': { delete: { tags: ['highlights'], summary: 'Delete a highlight', parameters: [{ name: 'id', in: 'path', required: true, schema: id }], responses: { 200: ok('{ deleted }', { type: 'object' }) } } },
  },
}
