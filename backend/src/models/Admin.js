import mongoose from 'mongoose'
import { connections } from '../config/db.js'

const adminSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    username: { type: String, trim: true, default: '' },
    profilePicture: { type: String, trim: true, default: '' },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['admin', 'super-admin'], default: 'admin' },
    active: { type: Boolean, default: true },
    twoFactorEnabled: { type: Boolean, default: false },
    lastLoginAt: { type: Date, default: null },
    loginHistory: [
      {
        loggedInAt: { type: Date, default: Date.now },
        ip: { type: String, default: '' },
        userAgent: { type: String, default: '' },
      },
    ],
    joinedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
)

export const Admin = connections.app.models.Admin || connections.app.model('Admin', adminSchema)
