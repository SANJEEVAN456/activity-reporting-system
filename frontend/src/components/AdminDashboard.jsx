import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import Navbar from './Navbar'
import AdminProfilePage from './AdminProfilePage'
import CalendarView from './CalendarView'
import '../styles/admin.css'
import { authApiRequest } from '../utils/api'
import { API_BASE_URL } from '../utils/api'

export default function AdminDashboard({ user, setIsLoggedIn, theme, setTheme, currentView = 'dashboard', onNavigate }) {
  const REPORTS_PER_PAGE = 5
  const ARCHIVED_REPORTS_PER_PAGE = 5
  const [allReports, setAllReports] = useState([])
  const [submittedReports, setSubmittedReports] = useState([])
  const [archivedReports, setArchivedReports] = useState([])
  const [users, setUsers] = useState([])
  const [totalUsers, setTotalUsers] = useState(0)
  const [totalHours, setTotalHours] = useState(0)
  const [upcomingActivities, setUpcomingActivities] = useState(0)
  const [reviewDrafts, setReviewDrafts] = useState({})
  const [savingId, setSavingId] = useState('')
  const [userActionId, setUserActionId] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [archivedPage, setArchivedPage] = useState(1)
  const [selectedUserFilter, setSelectedUserFilter] = useState('')
  const [selectedDateFilter, setSelectedDateFilter] = useState('')

  const loadDashboardData = async () => {
    try {
      const [statsData, usersData] = await Promise.all([
        authApiRequest('/api/admin/stats'),
        authApiRequest('/api/admin/users'),
      ])
      setAllReports(statsData.activeReports || [])
      setSubmittedReports(statsData.submittedReports || [])
      setArchivedReports(statsData.archivedDeletedUserReports || [])
      setTotalUsers(statsData.totalUsers || 0)
      setTotalHours(Number(statsData.totalHours || 0))
      setUpcomingActivities(Number(statsData.upcomingActivities || 0))
      setUsers((usersData.users || []).filter((u) => u.role === 'user'))
    } catch {
      toast.error('Failed to load admin stats')
    }
  }

  useEffect(() => {
    loadDashboardData()
  }, [currentView])

  const filteredReports = submittedReports
  const totalPages = Math.max(1, Math.ceil(filteredReports.length / REPORTS_PER_PAGE))
  const paginatedReports = filteredReports.slice(
    (currentPage - 1) * REPORTS_PER_PAGE,
    currentPage * REPORTS_PER_PAGE,
  )
  const archivedTotalPages = Math.max(1, Math.ceil(archivedReports.length / ARCHIVED_REPORTS_PER_PAGE))
  const paginatedArchivedReports = archivedReports.slice(
    (archivedPage - 1) * ARCHIVED_REPORTS_PER_PAGE,
    archivedPage * ARCHIVED_REPORTS_PER_PAGE,
  )

  useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalPages))
  }, [totalPages])
  useEffect(() => {
    setArchivedPage((prev) => Math.min(prev, archivedTotalPages))
  }, [archivedTotalPages])

  const formatJoinedDate = (value) => {
    if (!value) return 'N/A'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return 'N/A'
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    })
  }

  const userSummaries = users.map((u) => {
    const keys = [u.email, u.name].filter(Boolean).map((value) => String(value).toLowerCase())
    const userReports = allReports.filter((report) => keys.includes(String(report.user || '').toLowerCase()))
    const activityCount = userReports.filter((report) => report.reportType !== 'event').length
    const eventCount = userReports.filter((report) => report.reportType === 'event').length
    const hours = userReports.reduce((sum, report) => sum + Number(report.duration || 0), 0)
    const upcomingCount = userReports.filter((report) => report.upcoming).length

    return {
      ...u,
      joinedLabel: formatJoinedDate(u.joinedAt || u.createdAt),
      activityCount,
      eventCount,
      hours,
      upcomingCount,
    }
  })
  const topPerformers = [...userSummaries]
    .sort((a, b) => (b.activityCount + b.eventCount) - (a.activityCount + a.eventCount))
    .slice(0, 3)

  const handleLogout = () => {
    localStorage.removeItem('authToken')
    localStorage.removeItem('authUser')
    setIsLoggedIn(false)
    onNavigate?.('/')
  }

  const updateDraft = (id, field, value) => {
    setReviewDrafts((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] || { adminComment: '', reviewSuggestion: '' }),
        [field]: value,
      },
    }))
  }

  const toggleUserActive = async (userId, active) => {
    const confirmed = window.confirm(
      active ? 'Are you sure you want to deactivate this user?' : 'Are you sure you want to activate this user?'
    )
    if (!confirmed) return

    try {
      setUserActionId(userId)
      await authApiRequest(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ active: !active }),
      })
      await loadDashboardData()
      toast.success(`User ${active ? 'deactivated' : 'activated'}`)
    } catch (err) {
      toast.error(err.message || 'Failed to update user')
    } finally {
      setUserActionId('')
    }
  }

  const deleteUser = async (userId) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this user? Their submitted activities and events will be moved to archived reports.'
    )
    if (!confirmed) return

    try {
      setUserActionId(userId)
      await authApiRequest(`/api/admin/users/${userId}`, { method: 'DELETE' })
      if (selectedUserFilter) {
        setSelectedUserFilter('')
      }
      setSelectedDateFilter('')
      await loadDashboardData()
      toast.success('User deleted and reports archived')
    } catch (err) {
      toast.error(err.message || 'Failed to delete user')
    } finally {
      setUserActionId('')
    }
  }

  const deleteReport = async (reportId) => {
    try {
      await authApiRequest(`/api/reports/${reportId}`, { method: 'DELETE' })
      setSubmittedReports((prev) => prev.filter((r) => r.id !== reportId))
      toast.success('Report deleted')
    } catch (err) {
      toast.error(err.message || 'Failed to delete report')
    }
  }

  const reviewReport = async (reportId, decision) => {
    try {
      setSavingId(reportId)
      const draft = reviewDrafts[reportId] || { adminComment: '', reviewSuggestion: '' }
      const data = await authApiRequest(`/api/admin/reports/${reportId}/review`, {
        method: 'PATCH',
        body: JSON.stringify({
          decision,
          adminComment: draft.adminComment,
          reviewSuggestion: draft.reviewSuggestion,
        }),
      })

      setSubmittedReports((prev) => prev.map((r) => (r.id === reportId ? data.report : r)))
      setReviewDrafts((prev) => {
        const next = { ...prev }
        delete next[reportId]
        return next
      })
      toast.success(`Report ${decision}`)
    } catch (err) {
      toast.error(err.message || 'Failed to update review')
    } finally {
      setSavingId('')
    }
  }

  const downloadCsv = (filename, rows) => {
    const csvRows = rows.map((row) =>
      row.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')
    )
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }

  const exportSubmittedReports = () => {
    downloadCsv('submitted-reports.csv', [
      ['Date', 'Activity', 'User', 'Hours', 'Status', 'Review'],
      ...submittedReports.map((report) => [
        report.date,
        report.reportType === 'event' ? (report.eventName || report.activity || 'Event') : report.activity,
        report.userName || report.user,
        report.duration || 0,
        report.status || 'pending',
        report.reviewStatus || '-',
      ]),
    ])
  }

  const exportArchivedReports = () => {
    downloadCsv('archived-reports.csv', [
      ['Date', 'Activity', 'User', 'Hours', 'Status', 'Comment'],
      ...archivedReports.map((report) => [
        report.date,
        report.reportType === 'event' ? (report.eventName || report.activity || 'Event') : report.activity,
        report.userName || report.user || 'Deleted User',
        report.duration || 0,
        'archived',
        report.adminComment || 'User deleted by admin.',
      ]),
    ])
  }

  const exportUserSummary = () => {
    downloadCsv('user-summary.csv', [
      ['User', 'Username', 'Joined', 'Activities', 'Events', 'Upcoming', 'Hours', 'Status'],
      ...userSummaries.map((item) => [
        item.name || item.email,
        item.username || '',
        item.joinedLabel,
        item.activityCount,
        item.eventCount,
        item.upcomingCount,
        item.hours,
        item.active ? 'Active' : 'Inactive',
      ]),
    ])
  }

  return (
    <div className="admin-page">
      <Navbar
        user={user}
        onProfileClick={() => onNavigate?.('/admin/profile')}
        theme={theme}
        onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        onLogout={handleLogout}
      />
      <div className="admin-greeting">
        <h1 className="admin-greeting-title">
          Hello, <span>{user?.name || 'Admin'}</span>
        </h1>
        <p className="admin-greeting-subtitle">Monitor users, reviews, and archived activity from one place.</p>
      </div>
      {currentView === 'profile' ? (
        <AdminProfilePage user={user} onBack={() => onNavigate?.('/admin')} onLogout={handleLogout} />
      ) : (
        <>
          <div className="page-title">Activity Reporting System</div>
          <div className="admin-content">
            <div className="admin-overview-grid">
              <div className="admin-card admin-stats-card">
                <h3>Admin Stats</h3>
                <div className="admin-stat-row"><span>Total Users</span><strong>{totalUsers}</strong></div>
                <div className="admin-stat-row"><span>Total Activities</span><strong>{allReports.length}</strong></div>
                <div className="admin-stat-row"><span>Submitted Activities</span><strong>{submittedReports.length}</strong></div>
                <div className="admin-stat-row"><span>Upcoming Activities</span><strong>{upcomingActivities}</strong></div>
                <div className="admin-stat-row"><span>Total Hours</span><strong>{totalHours}</strong></div>
              </div>
              <div className="admin-card admin-performance-card">
                <h3>User Performance</h3>
                {topPerformers.length === 0 ? (
                  <p className="admin-user-empty">No user activity yet.</p>
                ) : (
                  <ul className="admin-performance-list">
                    {topPerformers.map((userItem, index) => (
                      <li key={userItem.id} className="admin-performance-item">
                        <span className={`admin-performance-rank rank-${index + 1}`}>{index + 1}</span>
                        <span className="admin-performance-name">{userItem.name || userItem.email}</span>
                        <span className="admin-performance-tasks">
                          {userItem.activityCount + userItem.eventCount} Tasks
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="admin-card admin-reporting-card">
                <h3>Reporting Center</h3>
                <div className="admin-reporting-actions">
                  <button type="button" className="admin-page-btn" onClick={exportSubmittedReports}>Export Submitted CSV</button>
                  <button type="button" className="admin-page-btn" onClick={exportArchivedReports}>Export Archived CSV</button>
                  <button type="button" className="admin-page-btn" onClick={exportUserSummary}>Export User Summary</button>
                </div>
                <div className="admin-reporting-summary">
                  {userSummaries.slice(0, 4).map((item) => (
                    <div key={item.id} className="admin-reporting-summary-item">
                      <strong>{item.name || item.email}</strong>
                      <span>{item.activityCount + item.eventCount} tasks</span>
                      <span>{item.upcomingCount} upcoming</span>
                      <span>{item.hours} hrs</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="admin-sections-stack">
              <div className="admin-card admin-users-card">
                <h3>Registered Users</h3>
                <div className="admin-user-summary-header">
                  <span>No.</span>
                  <span>User</span>
                  <span>Joined</span>
                  <span>Activities</span>
                  <span>Events</span>
                  <span>Upcoming</span>
                  <span>Status</span>
                  <span>Action</span>
                </div>
                <ul className="admin-user-summary-list">
                  {userSummaries.length === 0 ? (
                    <li className="admin-user-empty">No registered users found.</li>
                  ) : (
                    userSummaries.map((u, index) => (
                      <li key={u.id} className="admin-user-summary-item">
                        <span className="admin-user-summary-number">{index + 1}</span>
                        <button
                          type="button"
                          className={`admin-user-summary-name ${selectedUserFilter === (u.email || u.name) ? 'active' : ''}`}
                          title={u.email || u.name}
                          onClick={() => setSelectedUserFilter((prev) => (prev === (u.email || u.name) ? '' : (u.email || u.name)))}
                        >
                          {u.name || u.email}
                        </button>
                        <span>{u.joinedLabel}</span>
                        <span>{u.activityCount}</span>
                        <span>{u.eventCount}</span>
                        <span>{u.upcomingCount}</span>
                        <div className="admin-user-actions-inline">
                          <button
                            type="button"
                            className={`admin-user-toggle ${u.active ? 'is-active' : 'is-inactive'}`}
                            onClick={() => toggleUserActive(u.id, u.active)}
                            aria-pressed={u.active}
                            title={u.active ? 'Deactivate user' : 'Activate user'}
                            disabled={userActionId === u.id}
                          >
                            <span className="admin-user-toggle-track" aria-hidden="true">
                              <span className="admin-user-toggle-thumb" />
                            </span>
                            <span className="admin-user-toggle-label">
                              {u.active ? 'Active' : 'Inactive'}
                            </span>
                          </button>
                        </div>
                        <div className="admin-user-actions-inline">
                          <button
                            type="button"
                            className="danger"
                            onClick={() => deleteUser(u.id)}
                            disabled={userActionId === u.id}
                          >
                            Delete
                          </button>
                        </div>
                      </li>
                    ))
                  )}
                </ul>
              </div>

              <div className="admin-card admin-calendar-card">
                <CalendarView
                  title="Submitted Calendar"
                  reports={submittedReports}
                  groupByUser
                  selectedDate={selectedDateFilter}
                  selectedUser={selectedUserFilter}
                  onDateSelect={setSelectedDateFilter}
                  onClearFilters={() => {
                    setSelectedUserFilter('')
                    setSelectedDateFilter('')
                  }}
                />
              </div>

              <div className="admin-card admin-submitted-card">
                <h3>Submitted Reports</h3>
                <div className="admin-report-pagination-summary">
                  <span>
                    Showing {filteredReports.length === 0 ? 0 : (currentPage - 1) * REPORTS_PER_PAGE + 1}
                    -
                    {Math.min(currentPage * REPORTS_PER_PAGE, filteredReports.length)} of {filteredReports.length}
                  </span>
                  <span>Page {currentPage} of {totalPages}</span>
                </div>
                <div className="admin-report-header">
                  <span>No.</span>
                  <span>Date</span>
                  <span>Activity</span>
                  <span>User</span>
                  <span>Hours</span>
                  <span>Status</span>
                  <span>Description</span>
                </div>
                <ul className="admin-list">
                  {filteredReports.length === 0 ? (
                    <li>No submitted reports yet.</li>
                  ) : (
                    paginatedReports.map((r, index) => (
                      <li key={r.id} className="admin-report-item">
                      <div className="admin-report-meta">
                        <span className="admin-report-number">{(currentPage - 1) * REPORTS_PER_PAGE + index + 1}</span>
                        <span>{r.date}</span>
                        <span>{r.reportType === 'event' ? (r.eventName || r.activity || 'Event') : r.activity}</span>
                        <span>{r.user}</span>
                        <span>{r.duration ? `${r.duration} hrs` : '0 hrs'}</span>
                        <span className="admin-report-status">{r.status || 'pending'}</span>
                        <span className="admin-report-desc">{r.description || '-'}</span>
                      </div>
                      <div className="admin-report-media-slot">
                        {r.reportType === 'event' && (r.eventAttachments || []).length > 0 ? (
                          <div className="admin-event-files">
                            {(r.eventAttachments || []).map((file) => (
                              <div key={file.id} className="admin-event-file">
                                {file.mimeType?.startsWith('image/') ? (
                                  <a href={`${API_BASE_URL}${file.url}`} target="_blank" rel="noreferrer">
                                    <img
                                      className="admin-event-thumb"
                                      src={`${API_BASE_URL}${file.url}`}
                                      alt={file.originalName}
                                    />
                                  </a>
                                ) : (
                                  <a className="admin-event-file-link" href={`${API_BASE_URL}${file.url}`} target="_blank" rel="noreferrer">
                                    {file.originalName}
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="admin-event-files admin-event-files-empty" aria-hidden="true" />
                        )}
                      </div>
                        {r.submittedForReview && !['approved', 'rejected'].includes(r.reviewStatus || '') ? (
                          <div className="admin-review-panel">
                            <div className="admin-review-panel-head">
                              <span className="admin-review-panel-title">Admin Review</span>
                              <span className="admin-review-panel-subtitle">Add comments before approval or rejection</span>
                            </div>
                            <div className="admin-comment-actions">
                              <label className="admin-review-field">
                                <span>Comment</span>
                                <input
                                  className="admin-report-comment"
                                  type="text"
                                  placeholder="Add admin comment"
                                  value={reviewDrafts[r.id]?.adminComment ?? ''}
                                  onChange={(e) => updateDraft(r.id, 'adminComment', e.target.value)}
                                />
                              </label>
                              <label className="admin-review-field">
                                <span>Suggestion</span>
                                <input
                                  className="admin-report-comment"
                                  type="text"
                                  placeholder="Add optional suggestion"
                                  value={reviewDrafts[r.id]?.reviewSuggestion ?? ''}
                                  onChange={(e) => updateDraft(r.id, 'reviewSuggestion', e.target.value)}
                                />
                              </label>
                              <div className="admin-review-actions">
                                <button
                                  type="button"
                                  className="admin-approve"
                                  disabled={savingId === r.id}
                                  onClick={() => reviewReport(r.id, 'approved')}
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  className="admin-reject"
                                  disabled={savingId === r.id}
                                  onClick={() => reviewReport(r.id, 'rejected')}
                                >
                                  Reject
                                </button>
                                <button
                                  type="button"
                                  className="admin-delete"
                                  onClick={() => deleteReport(r.id)}
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="admin-review-panel admin-review-panel-readonly">
                            <div className="admin-review-panel-head">
                              <span className="admin-review-panel-title">Admin Review</span>
                              <span className="admin-review-panel-subtitle">Final review details</span>
                            </div>
                            <div className="admin-report-review-summary">
                              <span><strong>Review:</strong> {r.reviewStatus || 'pending'}</span>
                              <span><strong>Comment:</strong> {r.adminComment || '-'}</span>
                            </div>
                          </div>
                        )}
                      </li>
                    ))
                  )}
                </ul>
                {filteredReports.length > REPORTS_PER_PAGE ? (
                  <div className="admin-pagination">
                    <button
                      type="button"
                      className="admin-page-btn"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    >
                      Previous
                    </button>
                    {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                      <button
                        key={page}
                        type="button"
                        className={`admin-page-btn ${currentPage === page ? 'active' : ''}`}
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="admin-page-btn"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    >
                      Next
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="admin-card admin-archived-card">
                <h3>Archived Deleted User Reports</h3>
                <div className="admin-report-pagination-summary">
                  <span>
                    Showing {archivedReports.length === 0 ? 0 : (archivedPage - 1) * ARCHIVED_REPORTS_PER_PAGE + 1}
                    -
                    {Math.min(archivedPage * ARCHIVED_REPORTS_PER_PAGE, archivedReports.length)} of {archivedReports.length}
                  </span>
                  <span>Archived</span>
                </div>
                <ul className="admin-list">
                  {archivedReports.length === 0 ? (
                    <li>No archived deleted-user reports.</li>
                  ) : (
                    paginatedArchivedReports.map((report, index) => (
                      <li key={report.id} className="admin-report-item admin-archived-report-item">
                        <div className="admin-report-meta">
                          <span className="admin-report-number">{(archivedPage - 1) * ARCHIVED_REPORTS_PER_PAGE + index + 1}</span>
                          <span>{report.date}</span>
                          <span>{report.reportType === 'event' ? (report.eventName || report.activity || 'Event') : report.activity}</span>
                          <span>{report.userName || report.user || 'Deleted User'}</span>
                          <span>{report.duration ? `${report.duration} hrs` : '0 hrs'}</span>
                          <span className="admin-report-status">archived</span>
                          <span className="admin-report-desc">{report.adminComment || 'User deleted by admin.'}</span>
                        </div>
                      </li>
                    ))
                  )}
                </ul>
                {archivedReports.length > ARCHIVED_REPORTS_PER_PAGE ? (
                  <div className="admin-pagination">
                    <button
                      type="button"
                      className="admin-page-btn"
                      disabled={archivedPage === 1}
                      onClick={() => setArchivedPage((prev) => Math.max(1, prev - 1))}
                    >
                      Previous
                    </button>
                    {Array.from({ length: archivedTotalPages }, (_, index) => index + 1).map((page) => (
                      <button
                        key={page}
                        type="button"
                        className={`admin-page-btn ${archivedPage === page ? 'active' : ''}`}
                        onClick={() => setArchivedPage(page)}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="admin-page-btn"
                      disabled={archivedPage === archivedTotalPages}
                      onClick={() => setArchivedPage((prev) => Math.min(archivedTotalPages, prev + 1))}
                    >
                      Next
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
