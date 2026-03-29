import { useMemo } from 'react'
import '../styles/profile.css'

export default function ProfilePage({ user, reports = [], onBack }) {
  const joinedDate = user?.joinedAt || null

  const formattedJoinedDate = useMemo(() => {
    if (!joinedDate) return 'N/A'
    const date = new Date(joinedDate)
    if (Number.isNaN(date.getTime())) return 'N/A'
    return date.toLocaleDateString()
  }, [joinedDate])

  const stats = useMemo(() => {
    const activeReports = reports.filter((r) => !r.deletedByAdmin && r.status !== 'deleted')
    const upcomingReports = activeReports.filter((r) => r.upcoming)
    const completed = activeReports.filter((r) => r.status === 'completed').length
    const pending = activeReports.filter((r) => !r.upcoming && r.status !== 'completed').length
    const totalTimeSpent = activeReports.reduce((sum, report) => sum + Number(report.duration || 0), 0)
    const nextUpcoming = upcomingReports
      .slice()
      .sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')))[0] || null
    return {
      total: activeReports.length,
      completed,
      pending,
      upcoming: upcomingReports.length,
      nextUpcoming,
      totalTimeSpent,
    }
  }, [reports])

  return (
    <div className="profile-page">
      <div className="profile-page-card">
        <h2>Profile</h2>
        <div className="profile-card">
          <div className="profile-details">
            <h3>User Details</h3>
            <p>Name: {user?.name || 'N/A'}</p>
            <p>Username: {user?.username || 'N/A'}</p>
            <p>Email: {user?.email || 'N/A'}</p>
            <p>Joined date: {formattedJoinedDate}</p>
          </div>
        </div>
        <h3 className="profile-section-title">Activity statistics</h3>
        <div className="profile-stats">
          <div className="profile-stat-item">
            <span className="profile-stat-label">Total activities</span>
            <strong className="profile-stat-value">{stats.total}</strong>
          </div>
          <div className="profile-stat-item">
            <span className="profile-stat-label">Completed activities</span>
            <strong className="profile-stat-value">{stats.completed}</strong>
          </div>
          <div className="profile-stat-item">
            <span className="profile-stat-label">Pending activities</span>
            <strong className="profile-stat-value">{stats.pending}</strong>
          </div>
          <div className="profile-stat-item">
            <span className="profile-stat-label">Upcoming activities</span>
            <strong className="profile-stat-value">{stats.upcoming}</strong>
          </div>
          <div className="profile-stat-item">
            <span className="profile-stat-label">Total time spent</span>
            <strong className="profile-stat-value">{stats.totalTimeSpent} hrs</strong>
          </div>
        </div>
        <div className="profile-upcoming-panel">
          <h3 className="profile-section-title">Upcoming activity</h3>
          {stats.nextUpcoming ? (
            <div className="profile-upcoming-card">
              <strong>{stats.nextUpcoming.eventName || stats.nextUpcoming.activity || 'Upcoming activity'}</strong>
              <span>Date: {stats.nextUpcoming.date || 'N/A'}</span>
              <span>Type: {stats.nextUpcoming.reportType === 'event' ? 'Event' : 'Activity'}</span>
            </div>
          ) : (
            <p className="profile-upcoming-empty">No upcoming activities scheduled.</p>
          )}
        </div>
        <div className="profile-actions">
          <button type="button" className="ghost" onClick={onBack}>Back to Dashboard</button>
        </div>
      </div>
    </div>
  )
}
