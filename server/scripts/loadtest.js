// Load test — autocannon against a RUNNING server (npm run dev first).
// Logs in a test user, then hammers the hot read paths and prints a
// latency/throughput table you can quote in the README/resume.
//
//   npm run loadtest                 # defaults: 40 conns, 20s
//   CONN=100 DUR=30 npm run loadtest

import autocannon from 'autocannon'

const BASE = process.env.BASE_URL || 'http://localhost:5000'
const CONN = Number(process.env.CONN || 40)
const DUR = Number(process.env.DUR || 20)

const login = async () => {
  const email = 'loadtest@netbook.dev'
  for (const path of ['/api/auth/register', '/api/auth/login']) {
    const res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(
        path.endsWith('register')
          ? { displayName: 'Load Tester', email, password: 'loadtest123' }
          : { email, password: 'loadtest123' },
      ),
    })
    const cookie = (res.headers.getSetCookie?.() || [])
      .map((c) => c.split(';')[0]).join('; ')
    if (res.ok && cookie) return cookie
  }
  throw new Error(`Could not log in — is the server running at ${BASE}?`)
}

const run = (title, path, cookie) =>
  new Promise((resolve, reject) => {
    const inst = autocannon({
      url: `${BASE}${path}`,
      connections: CONN,
      duration: DUR,
      headers: cookie ? { Cookie: cookie } : {},
    })
    autocannon.track(inst, { renderResultsTable: true })
    inst.once('done', (r) => resolve({ title, r }))
    inst.once('error', reject)
  })

const fmt = (r) =>
  `${r.requests.average | 0} req/s | p50 ${r.latency.p50}ms | p97.5 ${r.latency.p97_5}ms | p99 ${r.latency.p99}ms | non-2xx ${r.non2xx}`

const cookie = await login()
console.log(`\nLoad test → ${BASE}  (${CONN} conns × ${DUR}s)\n`)

const rows = []
rows.push(['GET /api/health', await run('health', '/api/health', null)])
rows.push(['GET /api/posts (ranked feed)', await run('feed', '/api/posts', cookie)])
rows.push(['GET /api/posts/explore', await run('explore', '/api/posts/explore', cookie)])

console.log('\n=== Summary ===')
for (const [name, { r }] of rows) console.log(`${name.padEnd(34)} ${fmt(r)}`)
