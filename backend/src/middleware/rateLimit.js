const stores = new Map()

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim()
  }

  return req.ip || req.socket?.remoteAddress || 'unknown'
}

export function createRateLimiter({ windowMs, max, message }) {
  if (!Number.isFinite(windowMs) || windowMs <= 0) {
    throw new Error('windowMs must be a positive number')
  }
  if (!Number.isFinite(max) || max <= 0) {
    throw new Error('max must be a positive number')
  }

  const key = `${windowMs}:${max}:${message}`
  const state = stores.get(key) || new Map()
  stores.set(key, state)

  return (req, res, next) => {
    const now = Date.now()
    const clientIp = getClientIp(req)
    const entry = state.get(clientIp)

    if (!entry || entry.expiresAt <= now) {
      state.set(clientIp, { count: 1, expiresAt: now + windowMs })
      return next()
    }

    if (entry.count >= max) {
      const retryAfterSeconds = Math.max(1, Math.ceil((entry.expiresAt - now) / 1000))
      res.setHeader('Retry-After', String(retryAfterSeconds))
      return res.status(429).json({ message })
    }

    entry.count += 1
    return next()
  }
}
