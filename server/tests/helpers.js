import mongoose from 'mongoose'
import request from 'supertest'
import app from '../src/app.js'

export { request }

let seq = 0

// Connect once per test file (each file gets its own worker process)
export const connect = () =>
  mongoose.connection.readyState === 0 ? mongoose.connect(process.env.MONGODB_URI) : Promise.resolve()
export const disconnect = () => mongoose.disconnect()

const cookieOf = (res) =>
  (res.headers['set-cookie'] || []).map((c) => c.split(';')[0]).join('; ')

// Register a user, return their session cookie + uid
export const makeUser = async (displayName, extra = {}) => {
  const email = `${displayName.toLowerCase().replace(/\W/g, '')}${++seq}@test.dev`
  const res = await request(app).post('/api/auth/register')
    .send({ displayName, email, password: 'secret123', ...extra })
  if (res.status !== 201) {
    throw new Error(`register ${displayName} failed (${res.status}): ${JSON.stringify(res.body)}`)
  }
  return { cookie: cookieOf(res), uid: res.body.user.uid, email }
}

export const authed = (cookie, req) => req.set('Cookie', cookie)

// Make two users mutual friends (send request as a, accept as b)
export const befriend = async (a, b) => {
  const r = await authed(a.cookie, request(app).post(`/api/friends/request/${b.uid}`))
  if (r.status !== 201) throw new Error(`friend request failed: ${JSON.stringify(r.body)}`)
  const ok = await authed(b.cookie, request(app).post(`/api/friends/accept/${r.body.requestId}`))
  if (ok.status !== 200) throw new Error(`friend accept failed: ${JSON.stringify(ok.body)}`)
}
