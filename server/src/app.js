import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import compression from 'compression'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'

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

const app = express()

app.set('trust proxy', 1) // behind Render/Proxies — needed for secure cookies
app.use(helmet())
app.use(compression())
app.use(morgan('dev'))
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

// Global rate limit — generous ceiling, auth routes have stricter ones
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, max: 500 }))

app.get('/api/health', (req, res) => res.json({ ok: true, time: Date.now() }))

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
