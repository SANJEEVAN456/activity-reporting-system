import { useState } from 'react'
import { toast } from 'react-toastify'
import jsPDF from 'jspdf'
import '../styles/report.css'
import { API_BASE_URL } from '../utils/api'

const REPORTS_PER_PAGE = 2

export default function ReportList({
  reports,
  appliedFilters,
  updateReport,
  deleteReport,
  submitReport,
  replaceReport,
  variant = 'all',
}) {
  const [editingId, setEditingId] = useState(null)
  const [editActivity, setEditActivity] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editUser, setEditUser] = useState('')
  const [editDuration, setEditDuration] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editType, setEditType] = useState('activity')
  const [editEventName, setEditEventName] = useState('')
  const [uploadingId, setUploadingId] = useState('')
  const [pendingFiles, setPendingFiles] = useState({})
  const [currentPage, setCurrentPage] = useState(1)
  const [upcomingPage, setUpcomingPage] = useState(1)
  const [activeReportTab, setActiveReportTab] = useState('present')

  const filteredReports = reports.filter(r => {
    return (
      (appliedFilters.date ? r.date.includes(appliedFilters.date) : true) &&
      (appliedFilters.activity ? r.activity.toLowerCase().includes(appliedFilters.activity.toLowerCase()) : true) &&
      (appliedFilters.name ? r.user?.toLowerCase().includes(appliedFilters.name.toLowerCase()) : true)
    )
  })

  const activeReports = filteredReports.filter((r) => !r.exported)
  const currentReports = activeReports.filter((r) => !r.upcoming)
  const upcomingReports = activeReports.filter((r) => r.upcoming)
  const currentTotalPages = Math.max(1, Math.ceil(currentReports.length / REPORTS_PER_PAGE))
  const upcomingTotalPages = Math.max(1, Math.ceil(upcomingReports.length / REPORTS_PER_PAGE))
  const safeCurrentPage = Math.min(currentPage, currentTotalPages)
  const safeUpcomingPage = Math.min(upcomingPage, upcomingTotalPages)
  const paginatedCurrentReports = currentReports.slice((safeCurrentPage - 1) * REPORTS_PER_PAGE, safeCurrentPage * REPORTS_PER_PAGE)
  const paginatedUpcomingReports = upcomingReports.slice((safeUpcomingPage - 1) * REPORTS_PER_PAGE, safeUpcomingPage * REPORTS_PER_PAGE)

  const totalHours = activeReports
    .filter((r) => !r.upcoming && r.status !== 'deleted' && !r.deletedByAdmin)
    .reduce((sum, r) => sum + Number(r.duration || 0), 0)

  const formatDateTime = (value) => {
    if (!value) return '-'
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return value
    return d.toLocaleString()
  }

  const downloadPdf = (report) => {
    const activityLabel = report.reportType === 'event' ? (report.eventName || report.activity || 'Event') : report.activity
    const doc = new jsPDF()
    doc.setFontSize(16)
    doc.text('Activity Report', 14, 18)
    doc.setFontSize(11)
    doc.text(`User: ${report.user || '-'}`, 14, 30)
    doc.text(`Date: ${report.date || '-'}`, 14, 38)
    doc.text(`Activity: ${activityLabel || '-'}`, 14, 46)
    doc.text(`Hours: ${report.duration || 0}`, 14, 54)
    doc.text(`Status: ${report.status || '-'}`, 14, 62)
    doc.text(`Review: ${report.reviewStatus || '-'}`, 14, 70)
    doc.text(`Completed At: ${formatDateTime(report.completedAt)}`, 14, 78)
    if (report.description) {
      doc.text(`Description: ${report.description}`, 14, 86)
    }
    if (report.reviewSuggestion) {
      doc.text(`Suggestions: ${report.reviewSuggestion}`, 14, 98)
    }
    doc.save(`activity-report-${report.id}.pdf`)
    updateReport(report.id, { exported: true, exportedAt: new Date().toISOString() })
  }

  const startEdit = (report) => {
    setEditingId(report.id)
    setEditActivity(report.activity)
    setEditDate(report.date)
    setEditUser(report.user || '')
    setEditDuration(String(report.duration ?? ''))
    setEditDescription(report.description || '')
    setEditType(report.reportType || 'activity')
    setEditEventName(report.eventName || report.activity || '')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditActivity('')
    setEditDate('')
    setEditUser('')
    setEditDuration('')
    setEditDescription('')
    setEditType('activity')
    setEditEventName('')
  }

  const saveEdit = () => {
    if (!editDate) return
    if (editType === 'event') {
      if (!editEventName.trim()) return
      updateReport(editingId, {
        date: editDate,
        description: editDescription.trim(),
        eventName: editEventName.trim(),
        activity: editEventName.trim(),
      })
    } else {
      if (!editActivity) return
      updateReport(editingId, {
        activity: editActivity,
        date: editDate,
        user: editUser.trim() || undefined,
        duration: editDuration ? Number(editDuration) : 0,
        description: editDescription.trim(),
      })
    }
    toast.success('Report saved')
    cancelEdit()
  }

  const uploadAttachment = async (reportId, file) => {
    const token = localStorage.getItem('authToken')
    const form = new FormData()
    form.append('file', file)
    const response = await fetch(`${API_BASE_URL}/api/reports/${reportId}/attachments`, {
      method: 'POST',
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
      },
      body: form,
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) {
      throw new Error(data?.message || `Upload failed (${response.status})`)
    }
    return data.report
  }

  const deleteAttachment = async (reportId, attachmentId) => {
    const token = localStorage.getItem('authToken')
    const response = await fetch(`${API_BASE_URL}/api/reports/${reportId}/attachments/${attachmentId}`, {
      method: 'DELETE',
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
      },
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) {
      throw new Error(data?.message || `Delete failed (${response.status})`)
    }
    return data.report
  }

  const setPendingFile = (reportId, file) => {
    setPendingFiles((prev) => ({ ...prev, [reportId]: file }))
  }

  const clearPendingFile = (reportId) => {
    setPendingFiles((prev) => {
      const next = { ...prev }
      delete next[reportId]
      return next
    })
  }

  const recentActivities = reports
    .filter((r) => r.status === 'completed' && !r.upcoming)
    .sort((a, b) => String(b.completedAt || '').localeCompare(String(a.completedAt || '')))
    .slice(0, 3)

  const adminStatusItems = reports
    .filter((r) => r.reportType === 'event' || r.submittedForReview || r.reviewStatus)
    .sort((a, b) => String(b.reviewActionAt || b.updatedAt || b.createdAt || '').localeCompare(String(a.reviewActionAt || a.updatedAt || a.createdAt || '')))

  const getAdminStatusLabel = (report) => {
    if (report.reviewStatus === 'approved') return 'approved'
    if (report.reviewStatus === 'rejected') return 'rejected'
    if (report.submittedForReview) return 'pending review'
    if (report.reportType === 'event') {
      return (report.eventAttachments || []).length > 0 ? 'waiting for approval' : 'awaiting documents'
    }
    return 'in progress'
  }

  const getAdminStatusTimestamp = (report) => (
    report.reviewActionAt || report.updatedAt || report.createdAt || null
  )

  const showMain = variant === 'all' || variant === 'main'
  const showSummary = variant === 'all' || variant === 'summary'

  return (
    <div className="report-list-stack">
      {showMain ? (
        <div className="report-list report-box recent-box">
          <div className="report-header">
            <h3>Reports</h3>
            <div className="report-header-metrics">
              <span className="report-count">{activeReports.length} total</span>
              <span className="report-count">Total hours: {totalHours}</span>
            </div>
          </div>
          {activeReports.length === 0 ? (
            <div className="empty-state">
              <p>No matching reports.</p>
              <span>Add a new activity to get started.</span>
            </div>
          ) : (
            <div className="report-main-sections">
              <div className="report-view-toggle" role="tablist" aria-label="Report view type">
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeReportTab === 'present'}
                  className={`report-view-card ${activeReportTab === 'present' ? 'active' : ''}`}
                  onClick={() => setActiveReportTab('present')}
                >
                  <span className="report-view-label">Present Activities</span>
                  <span className="report-view-badge">{currentReports.length}</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeReportTab === 'upcoming'}
                  className={`report-view-card ${activeReportTab === 'upcoming' ? 'active' : ''}`}
                  onClick={() => setActiveReportTab('upcoming')}
                >
                  <span className="report-view-label">Upcoming Activities</span>
                  <span className="report-view-badge">{upcomingReports.length}</span>
                </button>
              </div>

              {activeReportTab === 'present' ? (
                <div className="report-section">
                  <div className="report-section-header">
                    <h4>Present Activities</h4>
                  </div>
                  {currentReports.length === 0 ? (
                    <p className="empty-inline">No present activities.</p>
                  ) : (
                    <ol className="report-user-list report-numbered-list">
                      {paginatedCurrentReports.map((r, index) => (
                        <li key={r.id} className="report-item">
                          {/** Event reports are shown with attachments and auto-submission */}
                          <span className="report-item-number">{(safeCurrentPage - 1) * REPORTS_PER_PAGE + index + 1}</span>
                          {editingId === r.id ? (
                            <div className="edit-row">
                                {editType !== 'event' ? (
                                  <>
                                    <input
                                      type="text"
                                      placeholder="Name (optional)"
                                      value={editUser}
                                      onChange={(e) => setEditUser(e.target.value)}
                                    />
                                    <input
                                      type="text"
                                      placeholder="Activity"
                                      value={editActivity}
                                      onChange={(e) => setEditActivity(e.target.value)}
                                    />
                                  </>
                                ) : (
                                  <input
                                    type="text"
                                    placeholder="Event Name"
                                    value={editEventName}
                                    onChange={(e) => setEditEventName(e.target.value)}
                                  />
                                )}
                                <input
                                  type="date"
                                  value={editDate}
                                  onChange={(e) => setEditDate(e.target.value)}
                                />
                                {editType !== 'event' ? (
                                  <>
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.5"
                                      placeholder="Duration (hours)"
                                      value={editDuration}
                                      onChange={(e) => setEditDuration(e.target.value)}
                                    />
                                    <select
                                      className="report-status-select"
                                      value={['pending', 'in progress', 'completed'].includes(r.status) ? r.status : 'pending'}
                                      onChange={(e) => updateReport(r.id, { status: e.target.value })}
                                    >
                                      <option value="pending">Pending</option>
                                      <option value="in progress">In progress</option>
                                      <option value="completed">Completed</option>
                                    </select>
                                  </>
                                ) : null}
                                <input
                                  type="text"
                                  placeholder="Description"
                                  value={editDescription}
                                  onChange={(e) => setEditDescription(e.target.value)}
                                />
                                <div className="action-row">
                                  <button type="button" onClick={saveEdit}>Save</button>
                                  <button type="button" className="ghost" onClick={cancelEdit}>Cancel</button>
                                </div>
                              </div>
                            ) : (
                              <div className="report-row">
                                {/** Use event name when available */}
                                {(() => {
                                  const activityLabel = r.reportType === 'event' ? (r.eventName || r.activity || 'Event') : r.activity
                                  return (
                                <div className="report-meta">
                                  <span className="report-date">{r.date}</span>
                                  <span className="report-activity">{activityLabel}</span>
                                  {r.reportType !== 'event' && r.duration ? (
                                    <span className="report-duration">{r.duration} hrs</span>
                                  ) : null}
                                  {r.reportType !== 'event' ? (
                                    <select
                                      className="report-status-select"
                                      value={['pending', 'in progress', 'completed'].includes(r.status) ? r.status : 'pending'}
                                      onChange={(e) => updateReport(r.id, { status: e.target.value })}
                                      disabled={r.deletedByAdmin || r.status === 'deleted' || r.status === 'completed'}
                                    >
                                      <option value="pending">Pending</option>
                                      <option value="in progress">In progress</option>
                                      <option value="completed">Completed</option>
                                    </select>
                                  ) : (
                                    <span className="report-status">event</span>
                                  )}
                                  {r.user ? <span className="report-user">{r.user}</span> : null}
                                </div>
                                  )
                                })()}
                                {r.reviewStatus ? (
                                  <div className="report-review-status">Review: {r.reviewStatus}</div>
                                ) : null}
                                {r.reviewSuggestion ? (
                                  <div className="report-review-suggestion">Suggestion: {r.reviewSuggestion}</div>
                                ) : null}
                                {r.deletedByAdmin || r.status === 'deleted' ? (
                                  <div className="report-deleted-note">Admin deleted this activity</div>
                                ) : null}
                                {r.description ? (
                                  <div className="report-description">{r.description}</div>
                                ) : null}
                                {r.adminComment ? (
                                  <div className="report-admin-comment">Admin: {r.adminComment}</div>
                                ) : null}
                                {r.reportType === 'event' ? (
                                  <div className="event-attachments">
                                    {r.reviewStatus !== 'approved' ? (
                                      <div className="event-upload">
                                        <input
                                          type="file"
                                          className="event-file-input"
                                          accept=".png,.jpg,.jpeg,.webp,.pdf,.doc,.docx"
                                          onChange={(e) => {
                                            const file = e.target.files?.[0]
                                            if (!file) return
                                            setPendingFile(r.id, file)
                                          }}
                                          disabled={uploadingId === r.id}
                                        />
                                        {pendingFiles[r.id] ? (
                                          <div className="event-upload-actions">
                                            <span className="event-file-name">{pendingFiles[r.id].name}</span>
                                            <button
                                              type="button"
                                              className="submit-report-btn"
                                              onClick={async () => {
                                                setUploadingId(r.id)
                                                try {
                                                  const updated = await uploadAttachment(r.id, pendingFiles[r.id])
                                                  replaceReport?.(updated)
                                                  toast.success('File uploaded')
                                                  clearPendingFile(r.id)
                                                } catch (err) {
                                                  toast.error(err.message || 'Upload failed')
                                                } finally {
                                                  setUploadingId('')
                                                }
                                              }}
                                              disabled={uploadingId === r.id}
                                            >
                                              Upload File
                                            </button>
                                          </div>
                                        ) : null}
                                      </div>
                                    ) : null}
                                    {(r.eventAttachments || []).length > 0 ? (
                                      <ul className="event-file-list">
                                        {r.eventAttachments.map((file) => (
                                          <li key={file.id} className="event-file-item">
                                            <a href={`${API_BASE_URL}${file.url}`} target="_blank" rel="noreferrer">
                                              {file.originalName}
                                            </a>
                                            {r.reviewStatus !== 'approved' ? (
                                              <button
                                                type="button"
                                                className="ghost"
                                                onClick={async () => {
                                                  try {
                                                    const updated = await deleteAttachment(r.id, file.id)
                                                    replaceReport?.(updated)
                                                    toast.success('File removed')
                                                  } catch (err) {
                                                    toast.error(err.message || 'Failed to delete')
                                                  }
                                                }}
                                              >
                                                Delete
                                              </button>
                                            ) : null}
                                          </li>
                                        ))}
                                      </ul>
                                    ) : (
                                      <p className="empty-inline">Upload an image or document for this event.</p>
                                    )}
                                  </div>
                                ) : null}
                                {r.deletedByAdmin || r.status === 'deleted' ? null : (
                                  <>
                                    {(() => {
                                      const isApproved = r.reviewStatus === 'approved'
                                      const isRejected = r.reviewStatus === 'rejected'
                                      const isPendingReview = r.submittedForReview && !isApproved && !isRejected
                                      const canEditDelete = !isPendingReview && !isApproved
                                      return (
                                        <>
                                          {canEditDelete ? (
                                            <div className="action-row">
                                              <button type="button" className="ghost" onClick={() => startEdit(r)}>Edit</button>
                                              <button
                                                type="button"
                                                className="danger"
                                                onClick={() => {
                                                  deleteReport(r.id)
                                                  toast.success('Report deleted')
                                                }}
                                              >
                                                Delete
                                              </button>
                                            </div>
                                          ) : null}
                                          {r.reportType !== 'event' && r.readyForApproval && r.status === 'completed' && !isApproved ? (
                                      <button
                                        type="button"
                                        className="submit-report-btn"
                                        onClick={() => {
                                          submitReport(r.id)
                                          toast.info('Report submitted for review')
                                        }}
                                        disabled={r.submittedForReview}
                                      >
                                        {r.submittedForReview ? 'Submitted' : 'Submit for Approval'}
                                      </button>
                                          ) : null}
                                          {r.reportType === 'event' && (r.eventAttachments || []).length > 0 && !isApproved ? (
                                      <button
                                        type="button"
                                        className="submit-report-btn"
                                        onClick={() => {
                                          submitReport(r.id)
                                          toast.info('Event submitted for review')
                                        }}
                                        disabled={r.submittedForReview}
                                      >
                                        {r.submittedForReview ? 'Submitted' : 'Submit Event for Approval'}
                                      </button>
                                          ) : null}
                                          {r.reportType === 'event' && isApproved && (r.eventAttachments || []).length > 0 ? (
                                      <button
                                        type="button"
                                        className="submit-report-btn"
                                        onClick={() => {
                                          r.eventAttachments.forEach((file) => {
                                            window.open(`${API_BASE_URL}${file.url}`, '_blank', 'noopener,noreferrer')
                                          })
                                        }}
                                      >
                                        Download Documents
                                      </button>
                                          ) : null}
                                          {isApproved ? (
                                      <button
                                        type="button"
                                        className="submit-report-btn"
                                        onClick={() => downloadPdf(r)}
                                      >
                                        Download PDF
                                      </button>
                                          ) : null}
                                        </>
                                      )
                                    })()}
                                  </>
                                )}
                              </div>
                            )}
                          </li>
                      ))}
                    </ol>
                  )}
                    {currentTotalPages > 1 ? (
                      <div className="section-pagination">
                        <button type="button" className="section-page-btn" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={safeCurrentPage === 1}>
                          Previous
                        </button>
                        <span className="section-page-indicator">Page {safeCurrentPage} of {currentTotalPages}</span>
                        <button type="button" className="section-page-btn" onClick={() => setCurrentPage((page) => Math.min(currentTotalPages, page + 1))} disabled={safeCurrentPage === currentTotalPages}>
                          Next
                        </button>
                      </div>
                    ) : null}
                </div>
              ) : (
                <div className="report-section">
                    <div className="report-section-header">
                      <h4>Upcoming Activities</h4>
                    </div>
                    {upcomingReports.length === 0 ? (
                      <p className="empty-inline">No upcoming activities.</p>
                    ) : (
                      <ol className="report-user-list report-numbered-list">
                      {paginatedUpcomingReports.map((r, index) => (
                          <li key={r.id} className="report-item">
                            <span className="report-item-number">{(safeUpcomingPage - 1) * REPORTS_PER_PAGE + index + 1}</span>
                            <div className="report-row">
                                {(() => {
                                  const activityLabel = r.reportType === 'event' ? (r.eventName || r.activity || 'Event') : r.activity
                                  return (
                                <div className="report-meta">
                                  <span className="report-date">{r.date}</span>
                                  <span className="report-activity">{activityLabel}</span>
                                  {r.reportType !== 'event' && r.duration ? <span className="report-duration">{r.duration} hrs</span> : null}
                                  <span className="report-status">{r.reportType === 'event' ? 'event' : 'upcoming'}</span>
                                </div>
                                  )
                                })()}
                                <label className="report-upcoming-move">
                                  <input
                                    type="checkbox"
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        updateReport(r.id, { upcoming: false })
                                        toast.success('Moved to current activities')
                                      }
                                    }}
                                  />
                                  Add to present activities
                                </label>
                              </div>
                            </li>
                        ))}
                      </ol>
                    )}
                    {upcomingTotalPages > 1 ? (
                      <div className="section-pagination">
                        <button type="button" className="section-page-btn" onClick={() => setUpcomingPage((page) => Math.max(1, page - 1))} disabled={safeUpcomingPage === 1}>
                          Previous
                        </button>
                        <span className="section-page-indicator">Page {safeUpcomingPage} of {upcomingTotalPages}</span>
                        <button type="button" className="section-page-btn" onClick={() => setUpcomingPage((page) => Math.min(upcomingTotalPages, page + 1))} disabled={safeUpcomingPage === upcomingTotalPages}>
                          Next
                        </button>
                      </div>
                    ) : null}
                </div>
              )}
            </div>
          )}
        </div>
      ) : null}

      {showSummary ? (
        <>
          <div className="report-list report-box admin-status-box">
            <div className="report-header">
              <h3>Recent Activities</h3>
              <span className="report-count">{recentActivities.length} completed</span>
            </div>
            {recentActivities.length === 0 ? (
              <p className="empty-inline">No completed activities yet.</p>
            ) : (
            <ol className="report-user-list report-numbered-list">
              {recentActivities.map((r, index) => (
                <li key={r.id} className="report-item">
                  <span className="report-item-number">{index + 1}</span>
                  <div className="report-row">
                      {(() => {
                        const activityLabel = r.reportType === 'event' ? (r.eventName || r.activity || 'Event') : r.activity
                        return (
                      <div className="report-meta">
                        <span className="report-date">{r.date}</span>
                        <span className="report-activity">{activityLabel}</span>
                        {r.duration ? <span className="report-duration">{r.duration} hrs</span> : null}
                        <span className="report-status">completed</span>
                      </div>
                        )
                      })()}
                      {r.reviewStatus ? (
                        <div className="report-review-status">Review: {r.reviewStatus}</div>
                      ) : null}
                      <div className="report-completed-at">Completed: {formatDateTime(r.completedAt)}</div>
                    </div>
                  </li>
              ))}
            </ol>
          )}
        </div>

        <div className="report-list report-box">
            <div className="admin-status-scroll">
              <div className="report-header">
                <h3>Admin Status</h3>
                <span className="report-count">{adminStatusItems.length} updates</span>
              </div>
              {adminStatusItems.length === 0 ? (
                <p className="empty-inline">No admin decisions yet.</p>
              ) : (
              <ol className="report-user-list report-numbered-list admin-status-list">
                {adminStatusItems.map((r, index) => (
                  <li key={r.id} className="report-item">
                    <span className="report-item-number">{index + 1}</span>
                    <div className="report-row">
                        {(() => {
                          const activityLabel = r.reportType === 'event' ? (r.eventName || r.activity || 'Event') : r.activity
                          return (
                        <div className="report-meta">
                          <span className="report-date">{r.date}</span>
                          <span className="report-activity">{activityLabel}</span>
                          {r.duration ? <span className="report-duration">{r.duration} hrs</span> : null}
                          <span className="report-status">{getAdminStatusLabel(r)}</span>
                        </div>
                          )
                        })()}
                        <div className="report-completed-at">
                          Updated: {formatDateTime(getAdminStatusTimestamp(r))}
                        </div>
                        {r.adminComment ? (
                          <div className="report-admin-comment">Admin: {r.adminComment}</div>
                        ) : null}
                        {r.reviewSuggestion ? (
                          <div className="report-review-suggestion">Suggestion: {r.reviewSuggestion}</div>
                        ) : null}
                      </div>
                    </li>
                ))}
              </ol>
            )}
            </div>
        </div>
        </>
      ) : null}
    </div>
  )
}
