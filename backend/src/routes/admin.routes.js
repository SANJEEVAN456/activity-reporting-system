import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { Admin } from '../models/Admin.js'
import { User } from '../models/User.js'
import { Report } from '../models/Report.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { serializeReport, serializeUser } from '../utils/serializers.js'
import { isUsernameTaken, normalizeUsername } from '../utils/accounts.js'

const router = Router()

router.use(requireAuth, requireRole('admin'))

router.get('/users', async (_req, res) => {
  const users = await User.find({ role: 'user' }).sort({ createdAt: -1 })
  return res.json({ users: users.map(serializeUser) })
})

router.post('/users', async (req, res) => {
  const { name, email, password, active = true, username } = req.body || {}
  if (!name || !email || !password || !username) {
    return res.status(400).json({ message: 'Name, username, email, and password are required' })
  }

  const normalizedEmail = String(email).toLowerCase().trim()
  const [existingUser, existingAdmin] = await Promise.all([
    User.findOne({ email: normalizedEmail }),
    Admin.findOne({ email: normalizedEmail }),
  ])
  if (existingUser || existingAdmin) {
    return res.status(409).json({ message: 'Email already exists' })
  }

  const normalizedUsername = normalizeUsername(username)
  const usernameTaken = await isUsernameTaken(normalizedUsername)
  if (usernameTaken) {
    return res.status(409).json({ message: 'Username already exists' })
  }

  const passwordHash = await bcrypt.hash(String(password), 10)
  const user = await User.create({
    name: String(name).trim(),
    email: normalizedEmail,
    username: normalizedUsername,
    passwordHash,
    role: 'user',
    active: Boolean(active),
  })
  return res.status(201).json({ user: serializeUser(user) })
})

router.patch('/users/:id', async (req, res) => {
  const user = await User.findById(req.params.id)
  if (!user) {
    return res.status(404).json({ message: 'User not found' })
  }

  const { name, email, password, active, username } = req.body || {}
  if (typeof name === 'string') user.name = name.trim()
  if (typeof email === 'string') {
    const normalizedEmail = email.toLowerCase().trim()
    const [existingUser, existingAdmin] = await Promise.all([
      User.findOne({ email: normalizedEmail, _id: { $ne: user._id } }),
      Admin.findOne({ email: normalizedEmail }),
    ])
    if (existingUser || existingAdmin) {
      return res.status(409).json({ message: 'Email already exists' })
    }
    user.email = normalizedEmail
  }
  if (typeof username === 'string') {
    const normalizedUsername = normalizeUsername(username)
    if (!normalizedUsername) {
      return res.status(400).json({ message: 'Username is required' })
    }
    const usernameTaken = await isUsernameTaken(normalizedUsername, user._id)
    if (usernameTaken) {
      return res.status(409).json({ message: 'Username already exists' })
    }
    user.username = normalizedUsername
  }
  if (typeof active === 'boolean') user.active = active
  if (typeof password === 'string' && password.trim()) {
    user.passwordHash = await bcrypt.hash(password, 10)
  }
  await user.save()
  return res.json({ user: serializeUser(user) })
})

router.delete('/users/:id', async (req, res) => {
  const user = await User.findById(req.params.id)
  if (!user) {
    return res.status(404).json({ message: 'User not found' })
  }

  await Report.updateMany(
    { user: user._id },
    {
      $set: {
        archivedByUserDeletion: true,
        archivedAt: new Date(),
        archivedUserName: user.name,
        archivedUserEmail: user.email,
        deletedByAdmin: true,
        status: 'deleted',
        reviewStatus: null,
        reviewSuggestion: '',
        reviewActionAt: null,
        readyForApproval: false,
        submitted: false,
        submittedForReview: false,
        adminComment: 'User deleted by admin. Report archived.',
      },
    }
  )
  await user.deleteOne()
  return res.json({ message: 'User deleted and reports archived' })
})

router.get('/stats', async (_req, res) => {
  const totalUsers = await User.countDocuments({ role: 'user' })
  const activeReports = await Report.find({
    archivedByUserDeletion: { $ne: true },
    deletedByAdmin: { $ne: true },
    status: { $ne: 'deleted' },
  })
    .populate('user')
    .sort({ createdAt: -1 })
  const submittedReports = await Report.find({
    archivedByUserDeletion: { $ne: true },
    $or: [{ submittedForReview: true }, { submitted: true }],
  })
    .populate('user')
    .sort({ createdAt: -1 })
  const archivedDeletedUserReports = await Report.find({
    archivedByUserDeletion: true,
  })
    .populate('user')
    .sort({ archivedAt: -1, createdAt: -1 })

  const totalActivities = activeReports.length
  const totalHours = activeReports.reduce((sum, r) => sum + Number(r.duration || 0), 0)
  const upcomingActivities = activeReports.filter((r) => r.upcoming).length

  return res.json({
    totalUsers,
    totalActivities,
    totalHours,
    upcomingActivities,
    activeReports: activeReports.map(serializeReport),
    submittedReports: submittedReports.map(serializeReport),
    archivedDeletedUserReports: archivedDeletedUserReports.map(serializeReport),
  })
})

router.get('/reports', async (req, res) => {
  const status = String(req.query.status || '').toLowerCase()
  const query = {}

  if (status === 'pending') {
    query.submittedForReview = true
    query.reviewStatus = { $in: [null, 'pending'] }
  }
  if (status === 'reviewed') {
    query.reviewStatus = { $in: ['approved', 'rejected'] }
  }

  const reports = await Report.find(query).populate('user').sort({ createdAt: -1 })
  return res.json({ reports: reports.map(serializeReport) })
})

router.patch('/reports/:id/review', async (req, res) => {
  const { decision, adminComment = '', reviewSuggestion = '' } = req.body || {}
  if (!['approved', 'rejected'].includes(decision)) {
    return res.status(400).json({ message: 'Decision must be approved or rejected' })
  }

  const report = await Report.findById(req.params.id).populate('user')
  if (!report) {
    return res.status(404).json({ message: 'Report not found' })
  }

  report.reviewStatus = decision
  report.adminComment = String(adminComment || '').trim()
  report.reviewSuggestion = String(reviewSuggestion || '').trim()
  report.reviewActionAt = new Date()
  report.submittedForReview = false

  await report.save()
  await report.populate('user')
  return res.json({ report: serializeReport(report) })
})

export default router
