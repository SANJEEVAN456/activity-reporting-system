import bcrypt from 'bcryptjs'
import { app } from './app.js'
import { connectDatabase } from './config/db.js'
import { env } from './config/env.js'
import { Admin } from './models/Admin.js'
import { User } from './models/User.js'
import { Report } from './models/Report.js'

async function migrateLegacyAdmins() {
  const legacyAdmins = await User.find({ role: 'admin' })
  for (const legacy of legacyAdmins) {
    const existingAdmin = await Admin.findOne({ email: legacy.email })
    if (!existingAdmin) {
      await Admin.create({
        name: legacy.name,
        email: legacy.email,
        passwordHash: legacy.passwordHash,
        role: 'admin',
        active: legacy.active,
      })
    }

    const reportCount = await Report.countDocuments({ user: legacy._id })
    if (reportCount === 0) {
      await legacy.deleteOne()
    } else {
      legacy.role = 'user'
      await legacy.save()
    }
  }
}

async function seedAdmin() {
  const email = env.adminEmail.toLowerCase().trim()
  const existing = await Admin.findOne({ email })
  if (existing) {
    return
  }

  const passwordHash = await bcrypt.hash(env.adminPassword, 10)
  await Admin.create({
    name: 'Admin',
    email,
    passwordHash,
    role: 'admin',
    active: true,
  })
  console.log(`Seeded admin account: ${email}`)
}

async function start() {
  await connectDatabase()
  await migrateLegacyAdmins()
  await seedAdmin()
  const server = app.listen(env.port, () => {
    console.log(`Backend running on port ${env.port}`)
  })

  const shutdown = (signal) => {
    console.log(`Received ${signal}. Shutting down gracefully...`)
    server.close((error) => {
      if (error) {
        console.error('Error while shutting down server', error)
        process.exit(1)
      }

      process.exit(0)
    })
  }

  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))
}

start().catch((error) => {
  console.error('Failed to start server', error)
  process.exit(1)
})
