import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import authRoutes from './routes/auth.routes.js'
import reportRoutes from './routes/report.routes.js'
import adminRoutes from './routes/admin.routes.js'
import { env } from './config/env.js'
import { createRateLimiter } from './middleware/rateLimit.js'

export const app = express()
const authRateLimiter = createRateLimiter({
  windowMs: env.authRateLimitWindowMs,
  max: env.authRateLimitMax,
  message: 'Too many authentication attempts. Please try again later.',
})

app.disable('x-powered-by')
app.set('trust proxy', env.trustProxy)

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
  if (env.isProduction) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }
  next()
})

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || env.corsOrigins.includes(origin)) {
        return callback(null, true)
      }

      return callback(new Error('CORS origin not allowed'))
    },
    credentials: true,
  })
)
app.use(express.json({ limit: env.jsonBodyLimit }))
app.use(morgan(env.isProduction ? 'combined' : 'dev'))
app.use('/uploads', express.static(env.uploadDir))

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', environment: env.nodeEnv })
})

app.use('/api/auth', authRateLimiter, authRoutes)
app.use('/api/reports', reportRoutes)
app.use('/api/admin', adminRoutes)

app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ message: 'Internal server error' })
})
