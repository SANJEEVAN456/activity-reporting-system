import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { Admin } from '../models/Admin.js'
import { User } from '../models/User.js'

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''

    if (!token) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const payload = jwt.verify(token, env.jwtSecret)

    let user = null
    if (payload.role === 'admin' || payload.role === 'super-admin') {
      user = await Admin.findById(payload.sub)
    } else {
      user = await User.findById(payload.sub)
    }

    if (!user || !user.active) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    req.authUser = user
    return next()
  } catch {
    return res.status(401).json({ message: 'Unauthorized' })
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.authUser || !roles.includes(req.authUser.role)) {
      return res.status(403).json({ message: 'Forbidden' })
    }
    return next()
  }
}
