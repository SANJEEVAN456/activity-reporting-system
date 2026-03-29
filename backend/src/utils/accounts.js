import { Admin } from '../models/Admin.js'
import { User } from '../models/User.js'

export function createDefaultUsername(email) {
  return String(email || '')
    .toLowerCase()
    .trim()
    .split('@')[0]
}

export function normalizeUsername(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
}

export async function isUsernameTaken(username, excludeId = null) {
  const normalizedUsername = normalizeUsername(username)
  if (!normalizedUsername) return false

  const [userMatch, adminMatch] = await Promise.all([
    User.findOne({ username: normalizedUsername }).select('_id'),
    Admin.findOne({ username: normalizedUsername }).select('_id'),
  ])

  const matches = [userMatch, adminMatch].filter(Boolean)
  if (!excludeId) return matches.length > 0

  return matches.some((item) => item._id.toString() !== excludeId.toString())
}

export async function ensureUniqueUsername(username, email, excludeId = null) {
  const requested = normalizeUsername(username) || createDefaultUsername(email)
  let candidate = requested
  let suffix = 1

  while (await isUsernameTaken(candidate, excludeId)) {
    candidate = `${requested}${suffix}`
    suffix += 1
  }

  return candidate
}
