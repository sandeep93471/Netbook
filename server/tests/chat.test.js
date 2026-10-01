import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { request, connect, disconnect, makeUser, authed, befriend } from './helpers.js'
import app from '../src/app.js'

const fakeJwk = (x, y) => ({ kty: 'EC', crv: 'P-256', x, y, ext: true })

describe('chat + e2ee', () => {
  let a, b, convoId
  beforeAll(async () => {
    await connect()
    a = await makeUser('ChatA')
    b = await makeUser('ChatB')
  })
  afterAll(disconnect)

  it('blocks DMs between strangers, allows friends', async () => {
    const blocked = await authed(a.cookie, request(app).post('/api/chat/conversations')
      .send({ otherUserId: b.uid }))
    expect(blocked.status).toBe(403)

    await befriend(a, b)
    const convo = await authed(a.cookie, request(app).post('/api/chat/conversations')
      .send({ otherUserId: b.uid }))
    expect(convo.status).toBe(201)
    convoId = convo.body.conversationId
  })

  it('sends and reads plaintext messages', async () => {
    const sent = await authed(a.cookie, request(app)
      .post(`/api/chat/conversations/${convoId}/messages`).send({ text: 'hi there' }))
    expect(sent.status).toBe(201)

    const msgs = await authed(b.cookie, request(app)
      .get(`/api/chat/conversations/${convoId}/messages`))
    expect(msgs.body.messages.at(-1).text).toBe('hi there')
  })

  it('enables e2ee only after both sides publish keys', async () => {
    const early = await authed(a.cookie, request(app)
      .put(`/api/chat/conversations/${convoId}/e2ee`))
    expect(early.status).toBe(409) // peer hasn't published a key yet

    for (const [u, jwk] of [[a, fakeJwk('ax', 'ay')], [b, fakeJwk('bx', 'by')]]) {
      const r = await authed(u.cookie, request(app).put('/api/users/me/e2ee-key').send({ jwk }))
      expect(r.status).toBe(200)
    }
    const on = await authed(a.cookie, request(app)
      .put(`/api/chat/conversations/${convoId}/e2ee`))
    expect(on.status).toBe(200)
    expect(on.body.conversation.e2ee).toBe(true)
  })

  it('stores only ciphertext in e2ee rooms and rejects plaintext', async () => {
    const plain = await authed(a.cookie, request(app)
      .post(`/api/chat/conversations/${convoId}/messages`).send({ text: 'should fail' }))
    expect(plain.status).toBe(400)

    const sent = await authed(a.cookie, request(app)
      .post(`/api/chat/conversations/${convoId}/messages`)
      .send({ enc: { v: 1, iv: 'aXY=', ct: 'Y2lwaGVy' } }))
    expect(sent.status).toBe(201)
    expect(sent.body.message.text).toBe('')
    expect(sent.body.message.enc.ct).toBe('Y2lwaGVy')

    const msgs = await authed(b.cookie, request(app)
      .get(`/api/chat/conversations/${convoId}/messages`))
    const last = msgs.body.messages.at(-1)
    expect(last.text).toBe('')
    expect(last.enc.iv).toBe('aXY=')
  })
})
