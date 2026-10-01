import client from '@prometheus-io/client'

// Prometheus metrics — default process stats (event loop lag, heap, GC) plus
// app-level counters. Scraped at GET /api/metrics.
export const register = new client.Registry()
client.collectDefaultMetrics({ register })

export const httpRequests = new client.Counter({
  name: 'netbook_http_requests_total',
  help: 'HTTP requests by route and status',
  labelNames: ['method', 'route', 'status'],
  registers: [register],
})

export const httpDuration = new client.Histogram({
  name: 'netbook_http_request_duration_seconds',
  help: 'HTTP request latency by route',
  labelNames: ['method', 'route'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
  registers: [register],
})

export const cacheHits = new client.Counter({
  name: 'netbook_cache_hits_total',
  help: 'Cache hits (Redis or in-memory fallback)',
  registers: [register],
})

export const cacheMisses = new client.Counter({
  name: 'netbook_cache_misses_total',
  help: 'Cache misses',
  registers: [register],
})

export const socketsConnected = new client.Gauge({
  name: 'netbook_sockets_connected',
  help: 'Currently connected realtime sockets',
  registers: [register],
})

export const feedRankDuration = new client.Histogram({
  name: 'netbook_feed_rank_duration_seconds',
  help: 'Time spent scoring the feed candidate pool',
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25],
  registers: [register],
})

// Mounted early in app.js — labels settle on res.finish, when req.route is known
export const metricsMiddleware = (req, res, next) => {
  const end = httpDuration.startTimer()
  res.on('finish', () => {
    const route = req.route
      ? `${req.baseUrl || ''}${req.route.path}`
      : req.baseUrl || 'unmatched'
    httpRequests.inc({ method: req.method, route, status: res.statusCode })
    end({ method: req.method, route })
  })
  next()
}
