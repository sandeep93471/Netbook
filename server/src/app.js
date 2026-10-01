import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'
import crypto from 'crypto'
import mongoose from 'mongoose'
import { pinoHttp } from 'pino-http'
import swaggerUi from 'swagger-ui-express'

import authRoutes from './routes/auth.js'
import postRoutes from './routes/posts.js'
import userRoutes from './routes/users.js'
import commentRoutes from './routes/comments.js'
import friendRoutes from './routes/friends.js'
import chatRoutes from './routes/chat.js'
import notificationRoutes from './routes/notifications.js'
import storyRoutes from './routes/stories.js'
import highlightRoutes from './routes/highlights.js'
import { errorHandler } from './middleware/error.js'
import { logger } from './utils/logger.js'
import { metricsMiddleware, register } from './utils/metrics.js'
import { cache } from './utils/cache.js'
import { openapiSpec } from './docs/openapi.js'

const app = express()

app.set('trust proxy', 1) // behind Render/Proxies — needed for secure cookies
// CORP 'cross-origin' — the API is consumed by the client on a different origin
// (Vercel → Render); default 'same-origin' makes browsers discard responses.
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
app.use(compression())

// Structured request logging — one JSON line per request with a reqId that
// also lands on every app-level log for the same request (trace a request
// end-to-end through the logs).
app.use(pinoHttp({
  logger,
  genReqId: () => crypto.randomUUID(),
  serializers: {
    req: (req) => ({ method: req.method, url: req.url }),
    res: (res) => ({ status: res.statusCode }),
  },
  // /api/metrics gets scraped — don't spam the log with it
  autoLogging: { ignore: (req) => req.url === '/api/metrics' },
}))
app.use(metricsMiddleware)

app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())

// CORS — credentials: true so the browser sends httpOnly cookies cross-origin.
// In dev, any localhost port is allowed (Vite may pick 5173/5174/5175).
const isLocalOrigin = (o) => /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o)
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || isLocalOrigin(origin) || origin === process.env.CLIENT_URL) return cb(null, true)
    cb(new Error('Not allowed by CORS'))
  },
  credentials: true,
}))

// Global rate limit — generous ceiling, auth routes have stricter ones.
// RATE_LIMIT_MAX=off (or a number) lets load tests/self-hosts override it.
if (process.env.RATE_LIMIT_MAX !== 'off') {
  app.use('/api', rateLimit({
    windowMs: 15 * 60 * 1000,
    max: Number(process.env.RATE_LIMIT_MAX) || 500,
  }))
}

const DB_STATES = ['disconnected', 'connected', 'connecting', 'disconnecting']
// Liveness + the dependencies a host/load-balancer actually cares about
app.get('/api/health', (req, res) => res.json({
  ok: mongoose.connection.readyState === 1,
  time: Date.now(),
  uptimeSec: Math.round(process.uptime()),
  db: DB_STATES[mongoose.connection.readyState] || 'unknown',
  cache: cache.backend(),
  memMB: Math.round(process.memoryUsage().rss / 1048576),
}))

// Prometheus scrape endpoint — set METRICS_TOKEN to require ?token= (or
// Authorization: Bearer) so a public deploy doesn't leak internals.
app.get('/api/metrics', async (req, res) => {
  if (process.env.METRICS_TOKEN) {
    const t = req.query.token || req.headers.authorization?.replace('Bearer ', '')
    if (t !== process.env.METRICS_TOKEN) return res.status(403).json({ message: 'Forbidden' })
  }
  res.set('Content-Type', register.contentType)
  res.end(await register.metrics())
})

// Interactive API docs — OpenAPI 3 spec rendered by Swagger UI
app.get('/api/openapi.json', (req, res) => res.json(openapiSpec))
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec, { customSiteTitle: 'Netbook API' }))

app.use('/api/auth', authRoutes)
app.use('/api/posts', postRoutes)
app.use('/api/users', userRoutes)
app.use('/api/comments', commentRoutes)
app.use('/api/friends', friendRoutes)
app.use('/api/chat', chatRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/stories', storyRoutes)
app.use('/api/highlights', highlightRoutes)

app.use((req, res) => res.status(404).json({ message: 'Route not found' }))
app.use(errorHandler)

export default app
