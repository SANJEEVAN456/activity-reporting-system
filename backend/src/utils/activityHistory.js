import { ActivityHistory } from '../models/ActivityHistory.js'

const toObjectId = (value) => {
  if (!value) return null
  if (typeof value === 'string') return value
  if (value._id) return value._id
  return value
}

export async function recordActivityHistory({ action, report, actor, meta = {} }) {
  if (!action || !report || !actor) return

  const snapshot = report.toObject ? report.toObject({ depopulate: true }) : report
  const userId = toObjectId(snapshot.user || report.user)

  if (!userId) return

  try {
    await ActivityHistory.create({
      userId,
      reportId: toObjectId(report._id),
      action,
      actorId: toObjectId(actor._id),
      actorRole: actor.role,
      snapshot,
      meta,
    })
  } catch (error) {
    console.warn('Failed to record activity history', error)
  }
}
