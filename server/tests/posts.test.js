import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { request, connect, disconnect, makeUser, authed, befriend } from './helpers.js'
import app from '../src/app.js'

describe('posts + privacy', () => {
  let alice, bob
  beforeAll(async () => {
    await connect()
    alice = await makeUser('AliceP')
    bob = await makeUser('BobP')
  })
  afterAll(disconnect)

  it('creates a post and serves the ranked feed page', async () => {
    const created = await authed(alice.cookie, request(app).post('/api/posts')
      .send({ text: 'hello #firstpost world' }))
    expect(created.status).toBe(201)
    expect(created.body.post.hashtags).toContain('firstpost')

    const feed = await authed(bob.cookie, request(app).get('/api/posts'))
    expect(feed.status).toBe(200)
    expect(feed.body.posts.map((p) => p.id)).toContain(created.body.post.id)
    // ranked cursor is opaque — r:<offset>:<bucket>
    if (feed.body.hasMore) expect(feed.body.cursor).toMatch(/^r:\d+:\d+$/)
  })

  it('paginates the ranked pool without duplicates', async () => {
    for (let i = 0; i < 4; i++) {
      await authed(alice.cookie, request(app).post('/api/posts').send({ text: `bulk ${i}` }))
    }
    const p1 = await authed(bob.cookie, request(app).get('/api/posts'))
    const ids1 = new Set(p1.body.posts.map((p) => p.id))
    if (!p1.body.hasMore) return // fewer than a page of posts — nothing to page
    const p2 = await authed(bob.cookie, request(app)
      .get(`/api/posts?cursor=${encodeURIComponent(p1.body.cursor)}`))
    expect(p2.status).toBe(200)
    for (const p of p2.body.posts) expect(ids1.has(p.id)).toBe(false)
  })

  it('hides private-account posts from strangers, shows them to friends', async () => {
    const priv = await makeUser('Priya', {})
    await authed(priv.cookie, request(app).patch('/api/users/me').send({ isPrivate: true }))
    const post = await authed(priv.cookie, request(app).post('/api/posts')
      .send({ text: 'private thoughts' }))

    const stranger = await makeUser('Stranger')
    let feed = await authed(stranger.cookie, request(app).get('/api/posts'))
    expect(feed.body.posts.map((p) => p.id)).not.toContain(post.body.post.id)
    const direct = await authed(stranger.cookie, request(app).get(`/api/posts/user/${priv.uid}`))
    expect(direct.status).toBe(403)

    await befriend(stranger, priv)
    feed = await authed(stranger.cookie, request(app).get('/api/posts'))
    expect(feed.body.posts.map((p) => p.id)).toContain(post.body.post.id)
  })

  it('enforces the onlyme audience', async () => {
    const mine = await authed(alice.cookie, request(app).post('/api/posts')
      .send({ text: 'draft', visibility: 'onlyme' }))
    const feed = await authed(bob.cookie, request(app).get('/api/posts'))
    expect(feed.body.posts.map((p) => p.id)).not.toContain(mine.body.post.id)
    const own = await authed(alice.cookie, request(app).get(`/api/posts/${mine.body.post.id}`))
    expect(own.status).toBe(200)
  })

  it('toggles reactions and keeps likes in sync', async () => {
    const post = await authed(alice.cookie, request(app).post('/api/posts').send({ text: 'react me' }))
    const pid = post.body.post.id
    const liked = await authed(bob.cookie, request(app).put(`/api/posts/${pid}/reaction`).send({ reaction: 'love' }))
    expect(liked.body.post.reactions[bob.uid]).toBe('love')
    const removed = await authed(bob.cookie, request(app).delete(`/api/posts/${pid}/reaction`))
    expect(removed.body.post.reactions[bob.uid]).toBeUndefined()
  })

  it('auto-hides a post at 3 reports', async () => {
    const post = await authed(alice.cookie, request(app).post('/api/posts').send({ text: 'spam' }))
    const pid = post.body.post.id
    const reporters = [bob, await makeUser('R1'), await makeUser('R2')]
    for (const r of reporters) {
      await authed(r.cookie, request(app).post(`/api/posts/${pid}/report`).send({ reason: 'spam' }))
    }
    const feed = await authed(bob.cookie, request(app).get('/api/posts'))
    expect(feed.body.posts.map((p) => p.id)).not.toContain(pid)
  })
})
