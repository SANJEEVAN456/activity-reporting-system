import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import Navbar from './Navbar'
import ReportList from './ReportList'
import Graphs from './Graphs'
import UserBoard from './UserBoard'
import ProfilePage from './ProfilePage'
import ReportFilters from './ReportFilters'
import HistoryBox from './HistoryBox'
import CalendarView from './CalendarView'
import PendingActivitiesBox from './PendingActivitiesBox'
import MissedActivitiesBox from './MissedActivitiesBox'
import '../styles/dashboard.css'
import { authApiRequest } from '../utils/api'

export default function Dashboard({ user, setIsLoggedIn, theme, setTheme, currentView = 'dashboard', onNavigate }) {
  const [reports, setReports] = useState([])
  const [filterDate, setFilterDate] = useState('')
  const [filterActivity, setFilterActivity] = useState('')
  const [appliedFilters, setAppliedFilters] = useState({
    date: '',
    activity: '',
  })

  useEffect(() => {
    let cancelled = false

    const loadReports = async ({ silent = false } = {}) => {
      try {
        const data = await authApiRequest('/api/reports')
        if (!cancelled) {
          setReports(data.reports || [])
        }
      } catch (err) {
        if (!cancelled) {
          if (!silent) {
            toast.error(err.message || 'Failed to load reports')
          }
          setReports([])
        }
      }
    }

    loadReports()
    const refreshId = window.setInterval(() => {
      loadReports({ silent: true })
    }, 60000)

    return () => {
      cancelled = true
      window.clearInterval(refreshId)
    }
  }, [])

  const addReport = async (report) => {
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const optimisticReport = {
      ...report,
      id: report.id || tempId,
      date: typeof report.date === 'string' ? report.date.slice(0, 10) : report.date,
      createdAt: new Date().toISOString(),
    }
    setReports((prev) => [optimisticReport, ...prev])
    try {
      const data = await authApiRequest('/api/reports', {
        method: 'POST',
        body: JSON.stringify(report),
      })
      setReports((prev) => prev.map((r) => (r.id === optimisticReport.id ? data.report : r)))
      return { ok: true, report: data.report }
    } catch (err) {
      toast.error(err.message || 'Failed to add activity')
      setReports((prev) => prev.filter((r) => r.id !== optimisticReport.id))
      return { ok: false, error: err }
    }
  }

  const updateReport = async (id, updates) => {
    try {
      const data = await authApiRequest(`/api/reports/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      })
      setReports((prev) => prev.map((r) => (r.id === id ? data.report : r)))
    } catch (err) {
      toast.error(err.message || 'Failed to update report')
    }
  }

  const replaceReport = (report) => {
    setReports((prev) => prev.map((r) => (r.id === report.id ? report : r)))
  }

  const deleteReport = async (id) => {
    try {
      await authApiRequest(`/api/reports/${id}`, { method: 'DELETE' })
      setReports((prev) => prev.filter((r) => r.id !== id))
    } catch (err) {
      toast.error(err.message || 'Failed to delete report')
    }
  }

  const submitReport = async (id) => {
    await updateReport(id, { submitted: true, submittedForReview: true, reviewStatus: 'pending' })
  }

  const retryMissedActivity = async (report) => {
    const today = new Date().toISOString().slice(0, 10)
    await addReport({
      date: today,
      activity: report.activity,
      duration: Number(report.duration || 0),
      description: report.description || '',
      user: user?.email || user?.name || '',
      count: 1,
      status: 'pending',
      upcoming: false,
      completedAt: null,
      readyForApproval: false,
      reportType: 'activity',
    })
  }

  const applyFilters = () => {
    setAppliedFilters({
      date: filterDate,
      activity: filterActivity,
    })
  }

  const handleLogout = () => {
    localStorage.removeItem('authToken')
    localStorage.removeItem('authUser')
    setIsLoggedIn(false)
    onNavigate?.('/')
  }

  const activityOptions = Array.from(new Set(reports.map((r) => r.activity).filter(Boolean))).sort()
  const dateOptions = Array.from(new Set(reports.map((r) => r.date).filter(Boolean))).sort()

  const filteredReports = reports.filter((r) => {
    const matchDate = appliedFilters.date ? String(r.date || '') === appliedFilters.date : true
    const activityFilter = appliedFilters.activity?.trim().toLowerCase()
    const matchActivity = activityFilter
      ? (r.reportType === 'event' ? activityFilter === 'event' : String(r.activity || '').toLowerCase() === activityFilter)
      : true
    return matchDate && matchActivity
  })

  return (
    <div className="dashboard">
      <Navbar
        user={user}
        onProfileClick={() => onNavigate?.('/dashboard/profile')}
        theme={theme}
        onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        onLogout={handleLogout}
      />
      <div className="dashboard-greeting">
        <span className="dashboard-greeting-kicker">Welcome back</span>
        <h1 className="dashboard-greeting-title">
          Hello, <span>{user?.name || user?.email || 'User'}</span>
        </h1>
        <p className="dashboard-greeting-subtitle">Here is your activity workspace for today.</p>
      </div>
      {currentView === 'profile' ? (
        <ProfilePage user={user} reports={reports} onBack={() => onNavigate?.('/dashboard')} onLogout={handleLogout} />
      ) : (
        <>
          <div className="page-title">Activity Reporting System</div>
        <div className="dashboard-content">
          <div className="dashboard-row">
            <UserBoard addReport={addReport} currentUser={user} />
            <ReportList
              reports={reports}
              appliedFilters={appliedFilters}
              updateReport={updateReport}
              deleteReport={deleteReport}
              submitReport={submitReport}
              replaceReport={replaceReport}
              variant="main"
            />
          </div>
          <PendingActivitiesBox reports={reports} />
          <MissedActivitiesBox reports={reports} onRetry={retryMissedActivity} />
          <CalendarView title="Activity Calendar" reports={reports} className="report-list" />
          <ReportList
            reports={reports}
            appliedFilters={appliedFilters}
            updateReport={updateReport}
            deleteReport={deleteReport}
            submitReport={submitReport}
            replaceReport={replaceReport}
            variant="summary"
          />
          <HistoryBox reports={reports} currentUser={user} onDelete={deleteReport} />
          <ReportFilters
            filterDate={filterDate}
            filterActivity={filterActivity}
            setFilterDate={setFilterDate}
            setFilterActivity={setFilterActivity}
            applyFilters={applyFilters}
            activityOptions={activityOptions}
            dateOptions={dateOptions}
            filteredReports={filteredReports}
          />
          <Graphs reports={reports} />
        </div>
        </>
      )}
    </div>
  )
}
