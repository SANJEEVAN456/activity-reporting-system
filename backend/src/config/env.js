import path from 'path'
import dotenv from 'dotenv'

dotenv.config()

function readString(name, fallback = '') {
  return String(process.env[name] || fallback).trim()
}

function readBoolean(name, fallback = false) {
  const value = String(process.env[name] ?? '').trim().toLowerCase()
  if (!value) return fallback
  return ['1', 'true', 'yes', 'on'].includes(value)
}

function readNumber(name, fallback) {
  const raw = String(process.env[name] ?? '').trim()
  if (!raw) return fallback

  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid numeric environment variable: ${name}`)
  }

  return parsed
}

const nodeEnv = readString('NODE_ENV', 'development').toLowerCase()
const isProduction = nodeEnv === 'production'
const required = ['MONGO_URI', 'JWT_SECRET']

for (const key of required) {
  if (!readString(key)) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
}

const adminEmail = readString('ADMIN_EMAIL', 'admin@example.com').toLowerCase()
const adminPassword = readString('ADMIN_PASSWORD', 'admin123')
const adminResetSecret = readString('ADMIN_RESET_SECRET', 'ADMIN-2026')
const adminRegisterCode = readString('ADMIN_REGISTER_CODE', '123')
const corsOrigins = readString('FRONTEND_URL', 'http://localhost:5173')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean)

if (isProduction) {
  const requiredInProduction = ['FRONTEND_URL', 'ADMIN_EMAIL', 'ADMIN_PASSWORD', 'ADMIN_RESET_SECRET', 'ADMIN_REGISTER_CODE']

  for (const key of requiredInProduction) {
    if (!readString(key)) {
      throw new Error(`Missing required production environment variable: ${key}`)
    }
  }

  if (adminEmail === 'admin@example.com' || adminPassword === 'admin123' || adminResetSecret === 'ADMIN-2026' || adminRegisterCode === '123') {
    throw new Error('Refusing to start in production with default admin credentials or codes')
  }
}

if (corsOrigins.length === 0) {
  throw new Error('FRONTEND_URL must include at least one allowed origin')
}

export const env = {
  nodeEnv,
  isProduction,
  port: readNumber('PORT', 5000),
  mongoUri: readString('MONGO_URI'),
  mongoDirectUri: readString('MONGO_DIRECT_URI'),
  mongoDbName: readString('MONGO_DB'),
  jwtSecret: readString('JWT_SECRET'),
  jwtExpiresIn: readString('JWT_EXPIRES_IN', '7d'),
  corsOrigins,
  frontendUrl: corsOrigins[0],
  adminEmail,
  adminPassword,
  adminResetSecret,
  adminRegisterCode,
  uploadDir: path.resolve(process.cwd(), readString('UPLOAD_DIR', 'uploads')),
  trustProxy: readBoolean('TRUST_PROXY', isProduction),
  jsonBodyLimit: readString('JSON_BODY_LIMIT', '1mb'),
  authRateLimitWindowMs: readNumber('AUTH_RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000),
  authRateLimitMax: readNumber('AUTH_RATE_LIMIT_MAX', 20),
}
