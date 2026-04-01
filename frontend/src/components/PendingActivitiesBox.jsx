import { useMemo, useState } from 'react'
import '../styles/dashboard.css'

const ITEMS_PER_PAGE = 4

function getTodayDateString() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDateTime(value, fallbackLabel = 'Not available') {
  if (!value) return fallbackLabel
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return fallbackLabel
  return date.toLocaleString()
}

function formatActivityDateTime(report) {
  if (!report?.date) return 'Not available'
  const base = new Date(`${report.date}T00:00:00`)
  if (Number.isNaN(base.getTime())) return report.date
  return base.toLocaleString()
}

function getPendingLabel(report) {
  if (report.reportType === 'event') {
    if (report.reviewStatus === 'approved') return 'approved'
    if (report.reviewStatus === 'rejected') return 'rejected'
    if (report.submittedForReview) return 'awaiting admin review'
    if ((report.eventAttachments || []).length > 0) return 'ready to submit'
    return 'waiting for file upload'
  }

  return report.status || 'pending'
}

export default function PendingActivitiesBox({ reports = [] }) {
  const [page, setPage] = useState(1)

  const pendingReports = useMemo(() => {
    const today = getTodayDateString()
    return reports
      .filter((report) => !report.upcoming)
      .filter((report) => !report.deletedByAdmin && report.status !== 'deleted')
      .filter((report) => {
        if (report.reportType === 'event') {
          return report.reviewStatus !== 'approved'
        }
        return report.status !== 'completed' && (!report.date || String(report.date) >= today)
      })
      .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
  }, [reports])

  const totalPages = Math.max(1, Math.ceil(pendingReports.length / ITEMS_PER_PAGE))
  const safePage = Math.min(page, totalPages)
  const paginatedReports = pendingReports.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE)

  return (
    <section className="pending-activities-box">
      <div className="pending-activities-header">
        <div>
          <h3>Pending Activities</h3>
          <p>Activities stay here until their status becomes completed.</p>
        </div>
        <span className="pending-activities-count">{pendingReports.length}</span>
      </div>

      {pendingReports.length === 0 ? (
        <div className="pending-activities-empty">
          <p>No pending activities.</p>
          <span>New activities will appear here automatically.</span>
        </div>
      ) : (
        <>
        <div className="pending-activities-list">
          {paginatedReports.map((report) => (
            <article key={report.id} className="pending-activity-card">
              <div className="pending-activity-top">
                <strong>{report.reportType === 'event' ? (report.eventName || report.activity || 'Event') : report.activity}</strong>
                <span className={`pending-activity-status status-${String(getPendingLabel(report)).replace(/\s+/g, '-')}`}>
                  {getPendingLabel(report)}
                </span>
              </div>
              <div className="pending-activity-meta">
                <span><strong>Type:</strong> {report.reportType || 'activity'}</span>
                <span><strong>Created:</strong> {formatDateTime(report.createdAt, 'Just now')}</span>
                <span><strong>Activity:</strong> {formatActivityDateTime(report)}</span>
              </div>
              {report.description ? <p className="pending-activity-desc">{report.description}</p> : null}
            </article>
          ))}
        </div>
        {totalPages > 1 ? (
          <div className="section-pagination">
            <button type="button" className="section-page-btn" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={safePage === 1}>
              Previous
            </button>
            <span className="section-page-indicator">Page {safePage} of {totalPages}</span>
            <button type="button" className="section-page-btn" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={safePage === totalPages}>
              Next
            </button>
          </div>
        ) : null}
        </>
      )}
    </section>
  )
}
