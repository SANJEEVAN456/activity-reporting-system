import mongoose from 'mongoose'
import { connections } from '../config/db.js'

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    username: { type: String, trim: true, default: '' },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['user'], default: 'user' },
    active: { type: Boolean, default: true },
    joinedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
)

export const User = connections.app.models.User || connections.app.model('User', userSchema)
