import { useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import '../styles/report.css'

const formatMonth = (dateStr) => {
  const d = new Date(`${dateStr}T00:00:00`)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

const getWeekKey = (dateStr) => {
  const d = new Date(`${dateStr}T00:00:00`)
  const day = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - day)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-Wk-${m}-${dd}`
}

export default function HistoryBox({ reports, currentUser, onDelete }) {
  const [view, setView] = useState('daily')
  const email = currentUser?.email?.toLowerCase() || ''
  const name = currentUser?.name?.toLowerCase() || ''
  const userKeys = [email, name].filter(Boolean)

  const userReports = useMemo(() => {
    return reports
      .filter((r) => {
        const reportUser = (r.user || '').toLowerCase()
        return userKeys.includes(reportUser) && r.submitted
      })
  }, [reports, userKeys])

  const grouped = useMemo(() => {
    const map = new Map()
    userReports.forEach((r) => {
      const period =
        view === 'daily'
          ? r.date
          : view === 'weekly'
            ? getWeekKey(r.date)
            : formatMonth(r.date)
      if (!map.has(period)) {
        map.set(period, { period, count: 0, items: [], hours: 0 })
      }
      const entry = map.get(period)
      entry.count += 1
      entry.hours += Number(r.duration || 0)
      entry.items.push({
        id: r.id,
        activity: r.activity,
        duration: Number(r.duration || 0),
        description: r.description || '',
        status: r.status || 'pending',
        adminComment: r.adminComment || '',
      })
    })
    return Array.from(map.values()).sort((a, b) => String(b.period).localeCompare(String(a.period)))
  }, [userReports, view])

  return (
    <div className="history-box">
      <div className="report-header">
        <h3>History</h3>
        <span className="report-count">{userReports.length} total</span>
      </div>
      <div className="history-toggle">
        <button type="button" className={view === 'daily' ? 'active' : ''} onClick={() => setView('daily')}>Daily</button>
        <button type="button" className={view === 'weekly' ? 'active' : ''} onClick={() => setView('weekly')}>Weekly</button>
        <button type="button" className={view === 'monthly' ? 'active' : ''} onClick={() => setView('monthly')}>Monthly</button>
      </div>
      {grouped.length === 0 ? (
        <div className="empty-state">
          <p>No activity yet.</p>
          <span>Add a new activity to see it here.</span>
        </div>
      ) : (
        <div className="history-table-wrap">
          <table className="history-table">
            <thead>
              <tr>
                <th>Period</th>
                <th>Activity Count</th>
                <th>Activities</th>
                <th>Hours</th>
                <th>Descriptions</th>
                <th>Status</th>
                <th>Action</th>
                <th>Comment</th>
              </tr>
            </thead>
            <tbody>
              {grouped.map((row) => (
                <tr key={row.period}>
                  <td className="history-period">{row.period}</td>
                  <td className="history-count">{row.count}</td>
                  <td className="history-activities">
                    <div className="history-cell-list">
                      {row.items.map((item) => (
                        <div key={item.id} className="history-cell-item">
                          {item.activity}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="history-hours">
                    <div className="history-cell-list">
                      {row.items.map((item) => (
                        <div key={item.id} className="history-cell-item">
                          {item.duration}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="history-descriptions">
                    <div className="history-cell-list">
                      {row.items.map((item) => (
                        <div key={item.id} className="history-cell-item">
                          {item.description || '-'}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="history-status">
                    <div className="history-cell-list">
                      {row.items.map((item) => (
                        <div key={item.id} className="history-cell-item">
                          {item.status}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="history-actions">
                    <div className="history-cell-list">
                      {row.items.map((item) => (
                        <div key={item.id} className="history-cell-item">
                          <button
                            type="button"
                            className="history-delete-btn"
                            onClick={() => {
                              onDelete?.(item.id)
                              toast.success('History item deleted')
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="history-comments">
                    <div className="history-cell-list">
                      {row.items.map((item) => (
                        <div key={item.id} className="history-cell-item">
                          {item.adminComment || '-'}
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
