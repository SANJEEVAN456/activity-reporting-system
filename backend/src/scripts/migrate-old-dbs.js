import mongoose from 'mongoose'
import { connectDatabase } from '../config/db.js'
import { env } from '../config/env.js'
import { Admin } from '../models/Admin.js'
import { User } from '../models/User.js'
import { Report } from '../models/Report.js'
import { ActivityHistory } from '../models/ActivityHistory.js'

const connectionOptions = {
  serverSelectionTimeoutMS: 10000,
  connectTimeoutMS: 10000,
}

const getBaseDbName = (uri) => {
  try {
    const withoutParams = String(uri || '').split('?')[0]
    const parts = withoutParams.split('/')
    return parts[parts.length - 1] || ''
  } catch {
    return ''
  }
}

const baseDbName = getBaseDbName(env.mongoUri) || 'activity_reporting_system'

const legacyDbUser = process.env.MONGO_DB_USER || `${baseDbName}_user`
const legacyDbAdmin = process.env.MONGO_DB_ADMIN || `${baseDbName}_admin`
const legacyDbHistory = process.env.MONGO_DB_HISTORY || `${baseDbName}_history`

const log = (...args) => console.log('[migrate]', ...args)

async function openLegacyConnection(dbName) {
  const conn = mongoose.createConnection()
  await conn.openUri(env.mongoUri, { ...connectionOptions, dbName })
  return conn
}

async function migrate() {
  await connectDatabase()

  const legacyUserConn = await openLegacyConnection(legacyDbUser)
  const legacyAdminConn = await openLegacyConnection(legacyDbAdmin)
  const legacyHistoryConn = await openLegacyConnection(legacyDbHistory)

  const legacyUsers = await legacyUserConn.collection('users').find({}).toArray()
  const legacyAdmins = await legacyAdminConn.collection('admins').find({}).toArray()
  const legacyReports = await legacyUserConn.collection('reports').find({}).toArray()
  const legacyHistory = await legacyHistoryConn.collection('activityhistories').find({}).toArray()

  const userIdMap = new Map()

  let usersInserted = 0
  let usersMapped = 0
  let adminsInserted = 0

  for (const legacy of legacyUsers) {
    const role = legacy.role === 'admin' ? 'admin' : 'user'
    if (role === 'admin') {
      const adminExists = await Admin.findOne({ email: legacy.email })
      if (!adminExists) {
        await Admin.create({
          name: legacy.name,
          email: legacy.email,
          passwordHash: legacy.passwordHash,
          role: 'admin',
          active: legacy.active ?? true,
          joinedAt: legacy.joinedAt,
          createdAt: legacy.createdAt,
          updatedAt: legacy.updatedAt,
        })
        adminsInserted += 1
      }
      continue
    }

    const existingById = await User.findById(legacy._id)
    if (existingById) {
      userIdMap.set(String(legacy._id), String(existingById._id))
      usersMapped += 1
      continue
    }

    const existingByEmail = await User.findOne({ email: legacy.email })
    if (existingByEmail) {
      userIdMap.set(String(legacy._id), String(existingByEmail._id))
      usersMapped += 1
      continue
    }

    await User.create({
      _id: legacy._id,
      name: legacy.name,
      email: legacy.email,
      passwordHash: legacy.passwordHash,
      role: 'user',
      active: legacy.active ?? true,
      joinedAt: legacy.joinedAt,
      createdAt: legacy.createdAt,
      updatedAt: legacy.updatedAt,
    })
    userIdMap.set(String(legacy._id), String(legacy._id))
    usersInserted += 1
  }

  for (const legacy of legacyAdmins) {
    const adminExists = await Admin.findOne({ email: legacy.email })
    if (!adminExists) {
      await Admin.create({
        _id: legacy._id,
        name: legacy.name,
        email: legacy.email,
        passwordHash: legacy.passwordHash,
        role: 'admin',
        active: legacy.active ?? true,
        joinedAt: legacy.joinedAt,
        createdAt: legacy.createdAt,
        updatedAt: legacy.updatedAt,
      })
      adminsInserted += 1
    }
  }

  let reportsInserted = 0
  let reportsSkipped = 0

  for (const legacy of legacyReports) {
    const mappedUserId = userIdMap.get(String(legacy.user))
    if (!mappedUserId) {
      reportsSkipped += 1
      continue
    }

    const existing = await Report.findById(legacy._id)
    if (existing) {
      continue
    }

    await Report.create({
      ...legacy,
      user: mappedUserId,
    })
    reportsInserted += 1
  }

  let historyInserted = 0
  let historySkipped = 0

  for (const legacy of legacyHistory) {
    const mappedUserId = userIdMap.get(String(legacy.userId))
    if (!mappedUserId) {
      historySkipped += 1
      continue
    }

    const existing = await ActivityHistory.findById(legacy._id)
    if (existing) {
      continue
    }

    const mappedReportId = legacy.reportId ? String(legacy.reportId) : null

    await ActivityHistory.create({
      ...legacy,
      userId: mappedUserId,
      reportId: mappedReportId || undefined,
    })
    historyInserted += 1
  }

  await legacyUserConn.close()
  await legacyAdminConn.close()
  await legacyHistoryConn.close()

  log(`Users inserted: ${usersInserted}, mapped: ${usersMapped}`)
  log(`Admins inserted: ${adminsInserted}`)
  log(`Reports inserted: ${reportsInserted}, skipped: ${reportsSkipped}`)
  log(`History inserted: ${historyInserted}, skipped: ${historySkipped}`)
}

migrate()
  .then(() => {
    log('Migration complete.')
    process.exit(0)
  })
  .catch((error) => {
    console.error('[migrate] Failed', error)
    process.exit(1)
  })
