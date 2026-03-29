import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { Admin } from '../models/Admin.js'
import { User } from '../models/User.js'
import { createToken } from '../utils/token.js'
import { serializeUser } from '../utils/serializers.js'
import { requireAuth } from '../middleware/auth.js'
import { env } from '../config/env.js'
import { createDefaultUsername, ensureUniqueUsername, isUsernameTaken, normalizeUsername } from '../utils/accounts.js'

const router = Router()

function getRequestIp(req) {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim()
  }
  return req.ip || ''
}

async function findAccountByLogin(loginValue, role) {
  const normalizedLogin = String(loginValue || '').trim()
  const normalizedEmail = normalizedLogin.toLowerCase()
  const query = {
    $or: [
      { email: normalizedEmail },
      { username: normalizedLogin },
      { username: normalizedEmail },
    ],
  }

  if (role === 'admin') {
    return Admin.findOne(query)
  }

  if (role === 'user') {
    return User.findOne(query)
  }

  const user = await User.findOne(query)
  if (user) return user
  return Admin.findOne(query)
}

router.post('/register', async (req, res) => {
  const { name, email, password, role, adminCode, username } = req.body || {}
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'All fields are required' })
  }

  const normalizedEmail = String(email).toLowerCase().trim()
  const userExists = await User.findOne({ email: normalizedEmail })
  const adminExists = await Admin.findOne({ email: normalizedEmail })
  if (userExists || adminExists) {
    return res.status(409).json({ message: 'Email already registered' })
  }

  const normalizedRole = String(role || 'user').toLowerCase()
  if (!['user', 'admin'].includes(normalizedRole)) {
    return res.status(400).json({ message: 'Invalid account type' })
  }

  if (normalizedRole === 'admin' && String(adminCode || '') !== env.adminRegisterCode) {
    return res.status(401).json({ message: 'Invalid admin registration code' })
  }

  const normalizedUsername = normalizeUsername(username)
  if (normalizedUsername) {
    const usernameTaken = await isUsernameTaken(normalizedUsername)
    if (usernameTaken) {
      return res.status(409).json({ message: 'Username already registered' })
    }
  }

  const passwordHash = await bcrypt.hash(String(password), 10)
  const accountPayload = {
    name: String(name).trim(),
    email: normalizedEmail,
    username: await ensureUniqueUsername(normalizedUsername || createDefaultUsername(normalizedEmail), normalizedEmail),
    passwordHash,
  }

  const user =
    normalizedRole === 'admin'
      ? await Admin.create({ ...accountPayload, role: 'admin' })
      : await User.create({ ...accountPayload, role: 'user' })

  return res.status(201).json({
    message: 'Registration successful',
    user: serializeUser(user),
  })
})

router.post('/login', async (req, res) => {
  const { email, password, role } = req.body || {}
  if (!email || !password) {
    return res.status(400).json({ message: 'Username or email and password are required' })
  }

  const user = await findAccountByLogin(email, role)

  if (!user) {
    return res.status(404).json({ message: 'User is not registered. Please register first.' })
  }

  if (!user.active) {
    return res.status(401).json({ message: 'Your account is disabled. Please contact admin.' })
  }

  if (role && role !== user.role) {
    return res.status(401).json({ message: 'Invalid account type' })
  }

  const ok = await bcrypt.compare(String(password), user.passwordHash)
  if (!ok) {
    return res.status(401).json({ message: 'Password is incorrect.' })
  }

  user.lastLoginAt = new Date()
  if (Array.isArray(user.loginHistory)) {
    user.loginHistory.unshift({
      loggedInAt: user.lastLoginAt,
      ip: getRequestIp(req),
      userAgent: String(req.headers['user-agent'] || ''),
    })
    user.loginHistory = user.loginHistory.slice(0, 10)
  }
  await user.save()

  return res.json({
    token: createToken(user),
    user: serializeUser(user),
  })
})

router.post('/reset-password', async (req, res) => {
  const { email, newPassword, role, secretCode, verifyOnly } = req.body || {}
  if (!email) {
    return res.status(400).json({ message: 'Email is required' })
  }

  const normalizedEmail = String(email).toLowerCase().trim()
  let user = null
  let resolvedRole = role
  if (role === 'admin') {
    user = await Admin.findOne({ email: normalizedEmail })
  } else {
    user = await User.findOne({ email: normalizedEmail })
    if (!user && !role) {
      user = await Admin.findOne({ email: normalizedEmail })
      resolvedRole = user?.role
    }
  }

  if (!user) {
    return res.status(404).json({ message: 'Account not found' })
  }

  if (resolvedRole === 'admin') {
    if (user.role !== 'admin') {
      return res.status(400).json({ message: 'Admin account not found' })
    }
    if (String(secretCode || '') !== env.adminResetSecret) {
      return res.status(401).json({ message: 'Invalid secret code' })
    }
  }

  if (verifyOnly) {
    return res.json({ message: 'Account verified' })
  }

  if (!newPassword) {
    return res.status(400).json({ message: 'New password is required' })
  }

  user.passwordHash = await bcrypt.hash(String(newPassword), 10)
  await user.save()
  return res.json({ message: 'Password updated successfully' })
})

router.get('/me', requireAuth, async (req, res) => {
  return res.json({ user: serializeUser(req.authUser) })
})

router.patch('/me', requireAuth, async (req, res) => {
  const { name, email, username, profilePicture, twoFactorEnabled, currentPassword, newPassword } = req.body || {}
  const account = req.authUser

  if (typeof name === 'string' && name.trim()) {
    account.name = name.trim()
  }

  if (typeof email === 'string' && email.trim()) {
    const normalizedEmail = email.toLowerCase().trim()
    if (normalizedEmail !== account.email) {
      const existingUser = await User.findOne({ email: normalizedEmail })
      const existingAdmin = await Admin.findOne({ email: normalizedEmail })
      const emailTaken =
        (existingUser && existingUser._id.toString() !== account._id.toString()) ||
        (existingAdmin && existingAdmin._id.toString() !== account._id.toString())

      if (emailTaken) {
        return res.status(409).json({ message: 'Email already registered' })
      }
      account.email = normalizedEmail
      if (account.role === 'admin' || account.role === 'super-admin') {
        account.username = account.username || createDefaultUsername(normalizedEmail)
      }
    }
  }

  if (typeof username === 'string') {
    const normalizedUsername = normalizeUsername(username)
    if (!normalizedUsername) {
      return res.status(400).json({ message: 'Username is required' })
    }
    const usernameTaken = await isUsernameTaken(normalizedUsername, account._id)
    if (usernameTaken) {
      return res.status(409).json({ message: 'Username already registered' })
    }
    account.username = normalizedUsername
  }

  if ((account.role === 'admin' || account.role === 'super-admin') && typeof profilePicture === 'string') {
    account.profilePicture = profilePicture.trim()
  }

  if ((account.role === 'admin' || account.role === 'super-admin') && typeof twoFactorEnabled === 'boolean') {
    account.twoFactorEnabled = twoFactorEnabled
  }

  if (newPassword) {
    if (!currentPassword) {
      return res.status(400).json({ message: 'Current password is required' })
    }
    const matches = await bcrypt.compare(String(currentPassword), account.passwordHash)
    if (!matches) {
      return res.status(401).json({ message: 'Current password is incorrect' })
    }
    account.passwordHash = await bcrypt.hash(String(newPassword), 10)
  }

  await account.save()
  return res.json({ user: serializeUser(account) })
})

export default router
