import mongoose from 'mongoose'
import { connections } from '../config/db.js'

const reportSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: String, required: true, trim: true },
    activity: { type: String, required: true, trim: true },
    eventName: { type: String, default: '', trim: true },
    eventImageUrl: { type: String, default: '' },
    reportType: { type: String, enum: ['activity', 'event'], default: 'activity' },
    duration: { type: Number, default: 0 },
    description: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'in progress', 'completed', 'deleted'], default: 'pending' },
    upcoming: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
    readyForApproval: { type: Boolean, default: false },
    submitted: { type: Boolean, default: false },
    submittedForReview: { type: Boolean, default: false },
    reviewStatus: { type: String, enum: ['pending', 'approved', 'rejected', null], default: null },
    reviewSuggestion: { type: String, default: '' },
    adminComment: { type: String, default: '' },
    reviewActionAt: { type: Date, default: null },
    deletedByAdmin: { type: Boolean, default: false },
    archivedByUserDeletion: { type: Boolean, default: false },
    archivedAt: { type: Date, default: null },
    archivedUserName: { type: String, default: '' },
    archivedUserEmail: { type: String, default: '' },
    exported: { type: Boolean, default: false },
    exportedAt: { type: Date, default: null },
    eventAttachments: [
      {
        filename: { type: String, required: true },
        originalName: { type: String, required: true },
        mimeType: { type: String, required: true },
        size: { type: Number, required: true },
        url: { type: String, required: true },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
)

reportSchema.index({ user: 1, createdAt: -1 })

export const Report =
  connections.app.models.Report || connections.app.model('Report', reportSchema)
