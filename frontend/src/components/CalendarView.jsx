import { useMemo, useState } from 'react'
import '../styles/calendar.css'
import { API_BASE_URL } from '../utils/api'

const buildKey = (date) => {
  if (!date) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return ''
  const y = parsed.getFullYear()
  const m = String(parsed.getMonth() + 1).padStart(2, '0')
  const d = String(parsed.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const buildKeyFromDate = (date) => {
  if (!date) return ''
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const formatMonth = (value) => value.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

export default function CalendarView({
  reports = [],
  title = 'Calendar',
  className = '',
  groupByUser = false,
  selectedDate: externalSelectedDate,
  selectedUser = '',
  onDateSelect,
  onClearFilters,
}) {
  const detailsPerPage = 3
  const [monthDate, setMonthDate] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [internalSelectedDate, setInternalSelectedDate] = useState('')
  const [detailsPage, setDetailsPage] = useState(1)
  const selectedDate = externalSelectedDate ?? internalSelectedDate

  const handleDateSelect = (nextDate) => {
    if (externalSelectedDate === undefined) {
      setInternalSelectedDate(nextDate)
    }
    setDetailsPage(1)
    onDateSelect?.(nextDate)
  }

  const getStatusClass = (item) => {
    if (item.reviewStatus === 'approved') return 'status-approved'
    if (item.reviewStatus === 'rejected') return 'status-rejected'
    return 'status-pending'
  }

  const getAdminStatusLabel = (item) => {
    if (item.reviewStatus === 'approved') return 'approved'
    if (item.reviewStatus === 'rejected') return 'rejected'
    if (item.submittedForReview) return 'pending review'
    if (item.reportType === 'event') {
      return (item.eventAttachments || []).length > 0 ? 'ready for admin review' : 'awaiting documents'
    }
    return item.status || 'pending'
  }

  const renderMetaLine = (item) => {
    const baseLabel = item.reportType === 'event' ? 'Event' : `${item.duration || 0} hrs`
    const stateLabel = item.upcoming ? 'upcoming' : (item.status || 'pending')
    return `${baseLabel} | ${stateLabel}`
  }

  const itemsByDate = useMemo(() => {
    const map = new Map()
    reports.forEach((report) => {
      const key = buildKey(report.date)
      if (!key) return
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(report)
    })
    return map
  }, [reports])

  const { days, monthLabel } = useMemo(() => {
    const year = monthDate.getFullYear()
    const month = monthDate.getMonth()
    const first = new Date(year, month, 1)
    const last = new Date(year, month + 1, 0)
    const startOffset = first.getDay()
    const totalDays = last.getDate()
    const cells = []

    for (let i = 0; i < startOffset; i += 1) {
      cells.push(null)
    }
    for (let day = 1; day <= totalDays; day += 1) {
      cells.push(new Date(year, month, day))
    }

    return { days: cells, monthLabel: formatMonth(first) }
  }, [monthDate])

  const selectedItems = useMemo(() => {
    if (!selectedDate && !selectedUser) return []
    return reports.filter((item) => {
      const matchesDate = !selectedDate || buildKey(item.date) === selectedDate
      const itemUser = String(item.user || item.userName || '').toLowerCase()
      const selectedUserKey = String(selectedUser || '').toLowerCase()
      const matchesUser = !selectedUser || itemUser === selectedUserKey
      return matchesDate && matchesUser
    })
  }, [reports, selectedDate, selectedUser])

  const selectedCounts = useMemo(() => {
    const counts = { activities: 0, events: 0, upcoming: 0 }
    selectedItems.forEach((item) => {
      if (item.reportType === 'event') counts.events += 1
      else counts.activities += 1
      if (item.upcoming) counts.upcoming += 1
    })
    return counts
  }, [selectedItems])

  const groupedByUser = useMemo(() => {
    if (!groupByUser || selectedUser) return []
    const map = new Map()
    selectedItems.forEach((item) => {
      const key = item.user || item.userName || 'Unknown user'
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(item)
    })
    return Array.from(map.entries())
  }, [groupByUser, selectedItems, selectedUser])

  const goPrev = () => {
    setMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }

  const goNext = () => {
    setMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }

  const totalDetailPages = Math.max(1, Math.ceil(selectedItems.length / detailsPerPage))
  const paginatedSelectedItems = selectedItems.slice(
    (detailsPage - 1) * detailsPerPage,
    detailsPage * detailsPerPage,
  )

  const detailTitle = selectedDate && selectedUser
    ? `Details for ${selectedUser} on ${selectedDate}`
    : selectedDate
      ? `Details for ${selectedDate}`
      : `Details for ${selectedUser}`

  const clearAllFilters = () => {
    handleDateSelect('')
    onClearFilters?.()
  }

  const renderDetailItem = (item) => (
    <li
      key={item.id}
      className={`${item.reportType === 'event' ? 'event' : 'activity'} ${getStatusClass(item)}`.trim()}
    >
      <div className="calendar-detail-title">
        {item.reportType === 'event' ? (item.eventName || item.activity || 'Event') : item.activity}
      </div>
      <div className="calendar-detail-meta">{renderMetaLine(item)}</div>
      {item.reportType === 'event' ? (
        <div className="calendar-detail-meta">Admin Status | {getAdminStatusLabel(item)}</div>
      ) : null}
      {item.reportType === 'event' && (item.eventAttachments || []).length > 0 ? (
        <div className="calendar-detail-files">
          {item.eventAttachments.map((file) => (
            <div key={file.id} className="calendar-detail-file">
              {file.mimeType?.startsWith('image/') ? (
                <a href={`${API_BASE_URL}${file.url}`} target="_blank" rel="noreferrer">
                  <img
                    className="calendar-detail-thumb"
                    src={`${API_BASE_URL}${file.url}`}
                    alt={file.originalName}
                  />
                </a>
              ) : (
                <a
                  className="calendar-detail-file-link"
                  href={`${API_BASE_URL}${file.url}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {file.originalName}
                </a>
              )}
            </div>
          ))}
        </div>
      ) : null}
      {item.adminComment ? <div className="calendar-detail-desc">Admin: {item.adminComment}</div> : null}
      {item.reviewSuggestion ? <div className="calendar-detail-desc">Suggestion: {item.reviewSuggestion}</div> : null}
      {item.description ? <div className="calendar-detail-desc">{item.description}</div> : null}
    </li>
  )

  return (
    <div className={`calendar-card ${className}`.trim()}>
      <div className="calendar-header">
        <h3>{title}</h3>
        <div className="calendar-controls">
          <button type="button" onClick={goPrev} aria-label="Previous month">{'<'}</button>
          <span className="calendar-month">{monthLabel}</span>
          <button type="button" onClick={goNext} aria-label="Next month">{'>'}</button>
        </div>
      </div>
      <div className="calendar-grid calendar-weekdays">
        <span>Sun</span>
        <span>Mon</span>
        <span>Tue</span>
        <span>Wed</span>
        <span>Thu</span>
        <span>Fri</span>
        <span>Sat</span>
      </div>
      <div className="calendar-grid calendar-days">
        {days.map((date, index) => {
          if (!date) {
            return <div key={`empty-${index}`} className="calendar-cell empty" />
          }

          const key = buildKeyFromDate(date)
          const items = itemsByDate.get(key) || []
          const countSummary = items.reduce(
            (acc, item) => {
              if (item.reportType === 'event') acc.events += 1
              else acc.activities += 1
              if (item.upcoming) acc.upcoming += 1
              return acc
            },
            { activities: 0, events: 0, upcoming: 0 }
          )
          const totalCount = countSummary.activities + countSummary.events
          const countParts = []
          if (countSummary.activities > 0) countParts.push(`A${countSummary.activities}`)
          if (countSummary.events > 0) countParts.push(`E${countSummary.events}`)
          const countLabel = countParts.join(' / ')

          return (
            <button
              key={key}
              type="button"
              className={`calendar-cell ${items.length ? 'has-items' : ''} ${selectedDate === key ? 'active' : ''}`.trim()}
              onClick={() => handleDateSelect(selectedDate === key ? '' : key)}
            >
              <div className="calendar-day">
                <span>{date.getDate()}</span>
                {totalCount > 0 ? <span className="calendar-count">{countLabel}</span> : null}
              </div>
              {countSummary.upcoming > 0 ? (
                <div className="calendar-indicators">
                  <span className="calendar-indicator upcoming">Upcoming {countSummary.upcoming}</span>
                </div>
              ) : null}
            </button>
          )
        })}
      </div>
      {(selectedDate || selectedUser) ? (
        <div className="calendar-details">
          <div className="calendar-details-header">
            <span>{detailTitle}</span>
            <div className="calendar-details-actions">
              <button type="button" onClick={clearAllFilters}>Show All</button>
              {selectedDate ? <button type="button" onClick={() => handleDateSelect('')}>Close Date</button> : null}
            </div>
          </div>
          {selectedItems.length ? (
            <div className="calendar-details-counts">
              <span>Activities: {selectedCounts.activities}</span>
              <span>Events: {selectedCounts.events}</span>
              <span>Upcoming: {selectedCounts.upcoming}</span>
            </div>
          ) : null}
          {selectedItems.length === 0 ? (
            <p className="calendar-empty">No activities or events found for this filter.</p>
          ) : groupByUser && !selectedUser ? (
            <div className="calendar-user-groups">
              {groupedByUser.map(([userName, items]) => (
                <div key={userName} className="calendar-user-group">
                  <div className="calendar-user-name">{userName}</div>
                  <ul className="calendar-details-list">
                    {items.map((item) => renderDetailItem(item))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <ul className="calendar-details-list">
              {paginatedSelectedItems.map((item) => renderDetailItem(item))}
            </ul>
          )}
          {selectedItems.length > detailsPerPage ? (
            <div className="calendar-pagination">
              <button
                type="button"
                disabled={detailsPage === 1}
                onClick={() => setDetailsPage((prev) => Math.max(1, prev - 1))}
              >
                Previous
              </button>
              <span>Page {detailsPage} of {totalDetailPages}</span>
              <button
                type="button"
                disabled={detailsPage === totalDetailPages}
                onClick={() => setDetailsPage((prev) => Math.min(totalDetailPages, prev + 1))}
              >
                Next
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
