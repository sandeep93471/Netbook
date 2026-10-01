import { MongoMemoryServer } from 'mongodb-memory-server'

// One in-memory MongoDB for the whole test run — vitest propagates env vars
// set here into every worker. Tests never touch Atlas or your real database.
let mem

export default async function setup() {
  mem = await MongoMemoryServer.create()
  process.env.MONGODB_URI = mem.getUri('netbook-test')
  process.env.NODE_ENV = 'test'
  process.env.JWT_ACCESS_SECRET = 'test-access-secret'
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret'
  process.env.SEMANTIC_SEARCH = 'off' // never download the model in tests
  process.env.LOG_LEVEL = 'fatal' // keep test output clean
  delete process.env.EMAIL_USER // mailer falls back — no emails in tests
  return async () => { await mem.stop() }
}
