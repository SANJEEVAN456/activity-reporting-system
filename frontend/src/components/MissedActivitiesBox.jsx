import { useMemo, useState } from 'react'
import { toast } from 'react-toastify'
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

function formatDueDate(report) {
  if (!report?.date) return 'Not available'
  const dueDate = new Date(`${report.date}T00:00:00`)
  if (Number.isNaN(dueDate.getTime())) return 'Not available'
  dueDate.setDate(dueDate.getDate() + 3)
  return dueDate.toLocaleString()
}

export default function MissedActivitiesBox({ reports = [], onRetry }) {
  const [page, setPage] = useState(1)

  const missedReports = useMemo(() => {
    const today = getTodayDateString()
    return reports
      .filter((report) => report.reportType !== 'event')
      .filter((report) => !report.upcoming)
      .filter((report) => !report.deletedByAdmin && report.status !== 'deleted' && report.status !== 'completed')
      .filter((report) => report.date && String(report.date) < today)
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
  }, [reports])

  const totalPages = Math.max(1, Math.ceil(missedReports.length / ITEMS_PER_PAGE))
  const safePage = Math.min(page, totalPages)
  const paginatedReports = missedReports.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE)

  return (
    <section className="pending-activities-box missed-activities-box">
      <div className="pending-activities-header">
        <div>
          <h3>Missed Activities</h3>
          <p>Activities not completed on their activity date appear here for follow-up.</p>
        </div>
        <span className="pending-activities-count">{missedReports.length}</span>
      </div>

      {missedReports.length === 0 ? (
        <div className="pending-activities-empty">
          <p>No missed activities.</p>
          <span>Unfinished overdue activities will appear here automatically.</span>
        </div>
      ) : (
        <>
        <div className="pending-activities-list">
          {paginatedReports.map((report) => (
            <article key={report.id} className="pending-activity-card missed-activity-card">
              <div className="pending-activity-top">
                <strong>{report.activity}</strong>
                <span className="pending-activity-status missed-activity-status">missed</span>
              </div>
              <div className="pending-activity-meta">
                <span><strong>Created:</strong> {formatDateTime(report.createdAt, 'Just now')}</span>
                <span><strong>Activity:</strong> {formatDateTime(`${report.date}T00:00:00`, report.date)}</span>
                <span><strong>Due:</strong> {formatDueDate(report)}</span>
              </div>
              {report.description ? <p className="pending-activity-desc">{report.description}</p> : null}
              <div className="missed-activity-actions">
                <button
                  type="button"
                  className="missed-activity-btn"
                  onClick={() => {
                    onRetry?.(report)
                    toast.success('Activity added to reports for another attempt')
                  }}
                >
                  Add to Reports
                </button>
              </div>
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
