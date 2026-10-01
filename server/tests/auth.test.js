import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { request, connect, disconnect, makeUser, authed } from './helpers.js'
import app from '../src/app.js'

describe('auth', () => {
  beforeAll(connect)
  afterAll(disconnect)

  it('registers a user and sets auth cookies', async () => {
    const res = await request(app).post('/api/auth/register')
      .send({ displayName: 'Alice', email: 'alice@test.dev', password: 'secret123' })
    expect(res.status).toBe(201)
    expect(res.body.user.uid).toBeTruthy()
    expect(res.headers['set-cookie'].join(';')).toContain('access_token=')
  })

  it('rejects duplicate email registration', async () => {
    const res = await request(app).post('/api/auth/register')
      .send({ displayName: 'Alice2', email: 'alice@test.dev', password: 'secret123' })
    expect(res.status).toBe(409)
  })

  it('rejects bad login but accepts the right password', async () => {
    const bad = await request(app).post('/api/auth/login')
      .send({ email: 'alice@test.dev', password: 'wrong' })
    expect(bad.status).toBe(401)
    const good = await request(app).post('/api/auth/login')
      .send({ email: 'alice@test.dev', password: 'secret123' })
    expect(good.status).toBe(200)
    expect(good.body.user.email).toBe('alice@test.dev')
  })

  it('serves /me with the cookie and 401s without', async () => {
    const anon = await request(app).get('/api/auth/me')
    expect(anon.status).toBe(401)

    const { cookie, uid } = await makeUser('Carol')
    const me = await authed(cookie, request(app).get('/api/auth/me'))
    expect(me.status).toBe(200)
    expect(me.body.user.uid).toBe(uid)
  })

  it('rotates tokens via the refresh cookie', async () => {
    const { cookie } = await makeUser('Dave')
    const res = await authed(cookie, request(app).post('/api/auth/refresh'))
    expect(res.status).toBe(200)
    expect(res.headers['set-cookie'].join(';')).toContain('access_token=')
  })

  it('verifies email with the dev code', async () => {
    const res = await request(app).post('/api/auth/register')
      .send({ displayName: 'Erin', email: 'erin@test.dev', password: 'secret123' })
    const code = res.body.devCode
    expect(code).toBeTruthy()
    const cookie = (res.headers['set-cookie'] || []).map((c) => c.split(';')[0]).join('; ')
    const v = await authed(cookie, request(app).post('/api/auth/verify-email').send({ code }))
    expect(v.status).toBe(200)
    expect(v.body.verified).toBe(true)
  })
})
