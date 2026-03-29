import { useMemo, useState } from 'react'
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import '../styles/graphs.css'

export default function Graphs({ reports = [] }) {
  const [view, setView] = useState('daily')

  const formatShortDate = (value) => {
    if (!value) return value
    const [year, month, day] = String(value).split('-')
    if (!year || !month || !day) return value
    const yy = year.slice(-2)
    return `${Number(month)}-${Number(day)}-${yy}`
  }

  const getWeekKey = (dateStr) => {
    if (!dateStr) return 'Unknown'
    const d = new Date(`${dateStr}T00:00:00`)
    if (Number.isNaN(d.getTime())) return 'Unknown'
    const day = (d.getDay() + 6) % 7
    d.setDate(d.getDate() - day)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${y}-Wk-${m}-${dd}`
  }

  const formatMonth = (dateStr) => {
    if (!dateStr) return 'Unknown'
    const d = new Date(`${dateStr}T00:00:00`)
    if (Number.isNaN(d.getTime())) return 'Unknown'
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    return `${y}-${m}`
  }

  const chartData = useMemo(() => {
    const grouped = new Map()
    reports
      .filter((r) => !r.upcoming && r.status !== 'deleted' && !r.deletedByAdmin)
      .forEach((r) => {
      const dateStr = r.date || ''
      const key =
        view === 'daily'
          ? dateStr || 'Unknown'
          : view === 'weekly'
            ? getWeekKey(dateStr)
            : formatMonth(dateStr)
      const entry = grouped.get(key) || { date: key, count: 0, hours: 0 }
      entry.count += 1
      entry.hours += Number(r.duration || 0)
      grouped.set(key, entry)
    })
    return Array.from(grouped.values()).sort((a, b) => String(a.date).localeCompare(String(b.date)))
  }, [reports, view])

  return (
    <div className="graphs">
      <div className="graphs-header">
        <h3>Activity Trends</h3>
        <div className="graphs-toggle">
          <button type="button" className={view === 'daily' ? 'active' : ''} onClick={() => setView('daily')}>
            Daily
          </button>
          <button type="button" className={view === 'weekly' ? 'active' : ''} onClick={() => setView('weekly')}>
            Weekly
          </button>
          <button type="button" className={view === 'monthly' ? 'active' : ''} onClick={() => setView('monthly')}>
            Monthly
          </button>
        </div>
      </div>
      {chartData.length === 0 ? (
        <div className="graph-empty">No activity data yet.</div>
      ) : (
        <div className="graph-canvas">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <Line type="monotone" dataKey="count" stroke="#111827" strokeWidth={2} />
              <CartesianGrid stroke="rgba(17, 24, 39, 0.15)" />
              <XAxis dataKey="date" tick={{ fill: '#111827' }} tickFormatter={formatShortDate} />
              <YAxis tick={{ fill: '#111827' }} />
              <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid rgba(31, 41, 55, 0.12)', color: '#1f2937' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
 
