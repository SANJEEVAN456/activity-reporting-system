import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import multer from 'multer'
import { Report } from '../models/Report.js'
import { requireAuth } from '../middleware/auth.js'
import { serializeReport } from '../utils/serializers.js'
import { env } from '../config/env.js'

const router = Router()

const uploadsDir = env.uploadDir
fs.mkdirSync(uploadsDir, { recursive: true })

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '')
    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`
    cb(null, safeName)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed =
      file.mimetype.startsWith('image/') ||
      ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(
        file.mimetype
      )
    if (!allowed) {
      return cb(new Error('Unsupported file type'))
    }
    return cb(null, true)
  },
})

router.use(requireAuth)

function getTodayDateString() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

async function releaseDueUpcomingReports(userId = null) {
  const today = getTodayDateString()
  const query = {
    reportType: 'activity',
    upcoming: true,
    date: { $lte: today },
    archivedByUserDeletion: { $ne: true },
    deletedByAdmin: { $ne: true },
    status: { $ne: 'deleted' },
  }

  if (userId) {
    query.user = userId
  }

  await Report.updateMany(query, {
    $set: {
      upcoming: false,
      status: 'pending',
    },
  })
}

router.get('/', async (req, res) => {
  await releaseDueUpcomingReports(req.authUser.role === 'admin' ? null : req.authUser._id)

  const query = req.authUser.role === 'admin' ? {} : { user: req.authUser._id }
  const { status, reportType, upcoming, activity, dateFrom, dateTo, createdFrom, createdTo } = req.query || {}

  if (status) {
    query.status = String(status)
  }
  if (reportType) {
    query.reportType = String(reportType).toLowerCase() === 'event' ? 'event' : 'activity'
  }
  if (typeof upcoming !== 'undefined') {
    query.upcoming = String(upcoming).toLowerCase() === 'true'
  }
  if (activity) {
    const pattern = String(activity).trim()
    if (pattern) {
      query.$or = [{ activity: { $regex: pattern, $options: 'i' } }, { description: { $regex: pattern, $options: 'i' } }]
    }
  }
  if (dateFrom || dateTo) {
    const range = {}
    if (dateFrom) range.$gte = String(dateFrom)
    if (dateTo) range.$lte = String(dateTo)
    query.date = range
  }
  if (createdFrom || createdTo) {
    const range = {}
    if (createdFrom) range.$gte = new Date(String(createdFrom))
    if (createdTo) range.$lte = new Date(String(createdTo))
    query.createdAt = range
  }

  const reports = await Report.find(query).populate('user').sort({ createdAt: -1 })
  return res.json({ reports: reports.map(serializeReport) })
})

router.post('/', async (req, res) => {
  if (req.authUser.role !== 'user') {
    return res.status(403).json({ message: 'Only users can create reports' })
  }
  const { date, activity, duration, description, upcoming, status, reportType, eventName } = req.body || {}
  if (!date) {
    return res.status(400).json({ message: 'Date is required' })
  }
  const normalizedType = String(reportType || 'activity').toLowerCase() === 'event' ? 'event' : 'activity'
  if (normalizedType === 'activity' && !activity) {
    return res.status(400).json({ message: 'Activity is required' })
  }

  const normalizedEventName = normalizedType === 'event'
    ? String(eventName || activity || 'Event').trim()
    : ''

  if (normalizedType === 'event' && !normalizedEventName) {
    return res.status(400).json({ message: 'Event name is required' })
  }

  const report = await Report.create({
    user: req.authUser._id,
    date: String(date),
    activity: normalizedType === 'event' ? normalizedEventName : String(activity),
    eventName: normalizedType === 'event' ? normalizedEventName : '',
    eventImageUrl: '',
    reportType: normalizedType,
    duration: normalizedType === 'event' ? 0 : Number(duration || 0),
    description: String(description || ''),
    upcoming: normalizedType === 'event' ? false : Boolean(upcoming),
    status: normalizedType === 'event' ? 'completed' : status || 'pending',
    readyForApproval: normalizedType === 'event',
    submitted: false,
    submittedForReview: false,
    reviewStatus: null,
  })

  await report.populate('user')
  return res.status(201).json({ report: serializeReport(report) })
})

router.post('/:id/attachments', upload.single('file'), async (req, res) => {
  const report = await Report.findById(req.params.id).populate('user')
  if (!report) {
    return res.status(404).json({ message: 'Report not found' })
  }

  const isOwner = report.user?._id?.toString() === req.authUser._id.toString()
  const isAdmin = req.authUser.role === 'admin'
  if (!isOwner && !isAdmin) {
    return res.status(403).json({ message: 'Forbidden' })
  }

  if (report.reportType !== 'event') {
    return res.status(400).json({ message: 'Attachments are only allowed for events' })
  }

  if (!req.file) {
    return res.status(400).json({ message: 'File is required' })
  }

  const attachment = {
    filename: req.file.filename,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    size: req.file.size,
    url: `/uploads/${req.file.filename}`,
  }
  report.eventAttachments.push(attachment)

  if (req.file.mimetype?.startsWith('image/')) {
    if (!report.eventImageUrl) {
      report.eventImageUrl = attachment.url
    }
  }

  await report.save()
  await report.populate('user')
  return res.json({ report: serializeReport(report) })
})

router.delete('/:id/attachments/:attachmentId', async (req, res) => {
  const report = await Report.findById(req.params.id).populate('user')
  if (!report) {
    return res.status(404).json({ message: 'Report not found' })
  }

  const isOwner = report.user?._id?.toString() === req.authUser._id.toString()
  const isAdmin = req.authUser.role === 'admin'
  if (!isOwner && !isAdmin) {
    return res.status(403).json({ message: 'Forbidden' })
  }

  if (report.reportType !== 'event') {
    return res.status(400).json({ message: 'Attachments are only allowed for events' })
  }

  const attachment = report.eventAttachments.id(req.params.attachmentId)
  if (!attachment) {
    return res.status(404).json({ message: 'Attachment not found' })
  }

  const removedUrl = attachment.url
  const removedWasImage = attachment.mimeType?.startsWith('image/')

  const filePath = path.join(uploadsDir, attachment.filename)
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath)
  }

  attachment.deleteOne()

  if (removedWasImage && report.eventImageUrl === removedUrl) {
    const nextImage = report.eventAttachments.find((item) => item.mimeType?.startsWith('image/'))
    report.eventImageUrl = nextImage ? nextImage.url : ''
  }

  await report.save()
  await report.populate('user')
  return res.json({ report: serializeReport(report) })
})

router.patch('/:id', async (req, res) => {
  const report = await Report.findById(req.params.id).populate('user')
  if (!report) {
    return res.status(404).json({ message: 'Report not found' })
  }

  const isOwner = report.user?._id?.toString() === req.authUser._id.toString()
  const isAdmin = req.authUser.role === 'admin'
  if (!isOwner && !isAdmin) {
    return res.status(403).json({ message: 'Forbidden' })
  }

  const updates = req.body || {}
  const editableFields = isAdmin
    ? [
        'date',
        'activity',
        'eventName',
        'duration',
        'description',
        'status',
        'upcoming',
        'submitted',
        'submittedForReview',
        'reviewStatus',
        'reviewSuggestion',
        'adminComment',
        'reviewActionAt',
        'exported',
        'exportedAt',
      ]
    : [
        'date',
        'activity',
        'eventName',
        'duration',
        'description',
        'status',
        'upcoming',
        'submitted',
        'submittedForReview',
        'exported',
        'exportedAt',
      ]

  for (const key of editableFields) {
    if (Object.prototype.hasOwnProperty.call(updates, key)) {
      report[key] = updates[key]
    }
  }

  if (report.reportType === 'event' && Object.prototype.hasOwnProperty.call(updates, 'eventName')) {
    const normalizedEventName = String(updates.eventName || '').trim()
    report.eventName = normalizedEventName
    if (!Object.prototype.hasOwnProperty.call(updates, 'activity')) {
      report.activity = normalizedEventName || report.activity
    }
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'status')) {
    if (updates.status === 'completed' && !report.completedAt) {
      report.completedAt = new Date()
      report.readyForApproval = true
    }
    if (updates.status !== 'completed') {
      report.completedAt = null
      report.readyForApproval = false
    }
  }

  await report.save()
  await report.populate('user')
  return res.json({ report: serializeReport(report) })
})

router.delete('/:id', async (req, res) => {
  const report = await Report.findById(req.params.id).populate('user')
  if (!report) {
    return res.status(404).json({ message: 'Report not found' })
  }

  const isOwner = report.user?._id?.toString() === req.authUser._id.toString()
  const isAdmin = req.authUser.role === 'admin'
  if (!isOwner && !isAdmin) {
    return res.status(403).json({ message: 'Forbidden' })
  }

  await report.deleteOne()
  return res.json({ message: 'Report deleted' })
})

export default router
