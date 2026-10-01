import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { request, connect, disconnect } from './helpers.js'
import app from '../src/app.js'

describe('ops endpoints', () => {
  beforeAll(connect)
  afterAll(disconnect)

  it('health reports db + cache state', async () => {
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.db).toBe('connected')
    expect(['redis', 'memory']).toContain(res.body.cache)
  })

  it('exposes prometheus metrics', async () => {
    const res = await request(app).get('/api/metrics')
    expect(res.status).toBe(200)
    expect(res.text).toContain('netbook_http_requests_total')
  })

  it('serves the OpenAPI spec', async () => {
    const res = await request(app).get('/api/openapi.json')
    expect(res.status).toBe(200)
    expect(res.body.openapi).toBe('3.0.3')
    expect(res.body.paths['/posts']).toBeTruthy()
  })
})
