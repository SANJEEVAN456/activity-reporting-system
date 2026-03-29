import mongoose from 'mongoose'
import { connections } from '../config/db.js'

const activityHistorySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    reportId: { type: mongoose.Schema.Types.ObjectId, index: true },
    action: {
      type: String,
      enum: ['created', 'updated', 'deleted', 'reviewed'],
      required: true,
    },
    actorId: { type: mongoose.Schema.Types.ObjectId, required: true },
    actorRole: { type: String, enum: ['user', 'admin'], required: true },
    snapshot: { type: mongoose.Schema.Types.Mixed, default: {} },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
)

activityHistorySchema.index({ userId: 1, createdAt: -1 })

export const ActivityHistory =
  connections.app.models.ActivityHistory ||
  connections.app.model('ActivityHistory', activityHistorySchema)
