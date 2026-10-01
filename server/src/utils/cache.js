import { cacheHits, cacheMisses } from './metrics.js'
import { logger } from './logger.js'

// Cache-aside layer: Redis when REDIS_URL is set (Upstash/Redis Cloud free
// tier, or the redis service in docker-compose), otherwise a bounded
// in-process Map with TTL. Every operation is wrapped — a dead Redis can
// never take the API down; it just falls back to memory.
let redis = null
let redisReady = false

const MEM_MAX = 500 // evict oldest beyond this — unbounded maps leak memory
const mem = new Map() // key → { v: string, exp: number }

const memGet = (key) => {
  const e = mem.get(key)
  if (!e) return null
  if (e.exp && e.exp < Date.now()) { mem.delete(key); return null }
  return e.v
}
const memSet = (key, v, ttlSec) => {
  if (mem.size >= MEM_MAX) mem.delete(mem.keys().next().value)
  mem.set(key, { v, exp: ttlSec ? Date.now() + ttlSec * 1000 : 0 })
}
const memDelPrefix = (prefix) => {
  for (const k of mem.keys()) if (k.startsWith(prefix)) mem.delete(k)
}

// Connect lazily — import cost + TCP only happen when REDIS_URL is configured
const connectRedis = async () => {
  try {
    const { createClient } = await import('redis')
    redis = createClient({
      url: process.env.REDIS_URL,
      socket: { reconnectStrategy: (n) => Math.min(n * 500, 5000) },
    })
    redis.on('error', (err) => {
      redisReady = false
      logger.warn({ err: err.message }, 'redis error — serving from memory cache')
    })
    redis.on('ready', () => { redisReady = true; logger.info('redis cache connected') })
    await redis.connect()
  } catch (err) {
    redis = null
    logger.warn({ err: err.message }, 'redis unavailable — in-memory cache only')
  }
}
if (process.env.REDIS_URL) connectRedis()

const redGet = async (key) => {
  try { return await redis.get(key) } catch { redisReady = false; return null }
}
const redSet = async (key, v, ttlSec) => {
  try {
    if (ttlSec) await redis.set(key, v, { EX: ttlSec })
    else await redis.set(key, v)
  } catch { redisReady = false }
}
const redDelPrefix = async (prefix) => {
  try {
    for await (const k of redis.scanIterator({ MATCH: `${prefix}*`, COUNT: 100 })) {
      await redis.del(k)
    }
  } catch { redisReady = false }
}

export const cache = {
  backend: () => (redis && redisReady ? 'redis' : 'memory'),

  get: async (key) => {
    const raw = redis && redisReady ? await redGet(key) : memGet(key)
    if (raw == null) { cacheMisses.inc(); return null }
    cacheHits.inc()
    try { return JSON.parse(raw) } catch { return null }
  },

  set: async (key, value, ttlSec = 30) => {
    const raw = JSON.stringify(value)
    if (redis && redisReady) await redSet(key, raw, ttlSec)
    else memSet(key, raw, ttlSec)
  },

  // Delete a key or every key sharing a prefix ('feed:pool' kills all buckets)
  del: async (keyOrPrefix) => {
    if (redis && redisReady) await redDelPrefix(keyOrPrefix)
    else memDelPrefix(keyOrPrefix)
  },

  // The pattern all callers want: read-through with a loader
  wrap: async (key, ttlSec, loader) => {
    const hit = await cache.get(key)
    if (hit !== null) return hit
    const fresh = await loader()
    await cache.set(key, fresh, ttlSec)
    return fresh
  },
}
