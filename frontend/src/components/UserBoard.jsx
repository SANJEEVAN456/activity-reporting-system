import { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import '../styles/report.css'

function getTodayDateString() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function UserBoard({ addReport, currentUser }) {
  const [reportType, setReportType] = useState('activity')
  const [activity, setActivity] = useState('')
  const [date, setDate] = useState('')
  const [duration, setDuration] = useState('')
  const [description, setDescription] = useState('')
  const [eventName, setEventName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const userId = currentUser?.email || currentUser?.name || ''
  const today = getTodayDateString()

  useEffect(() => {
    if (reportType === 'event') {
      setDate(today)
      return
    }

    setDate((currentDate) => {
      if (currentDate && currentDate < today) {
        return today
      }
      return currentDate
    })
  }, [reportType, today])

  const handleDateChange = (value) => {
    if (reportType === 'event') {
      setDate(today)
      return
    }
    if (value && value < today) {
      setDate(today)
      return
    }
    setDate(value)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (isSubmitting || !date || !userId) return
    if (reportType === 'activity' && date < today) {
      toast.error('Activities can only be added for today or future dates.')
      return
    }
    if (reportType === 'event') {
      if (date !== today) {
        toast.error('Events can only be created for today.')
        return
      }
      if (!eventName.trim()) {
        toast.error('Enter an event name.')
        return
      }
      setIsSubmitting(true)
      const result = await addReport({
        date,
        reportType: 'event',
        activity: eventName.trim(),
        eventName: eventName.trim(),
        duration: 0,
        description: '',
        status: 'completed',
        upcoming: false,
        readyForApproval: true,
        submitted: false,
        submittedForReview: false,
        reviewStatus: null,
      })
      setIsSubmitting(false)
      if (result?.ok) {
        toast.success('Event created. Upload file and submit for approval.')
        setDate('')
        setEventName('')
      }
      return
    }
    if (!activity.trim()) {
      toast.error('Enter an activity name.')
      return
    }
    if (!duration || Number(duration) <= 0) {
      toast.error('Enter a valid duration.')
      return
    }

    const isUpcoming = date > today
    setIsSubmitting(true)
    const result = await addReport({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        date,
        activity: activity.trim(),
        duration: Number(duration),
        description: description.trim(),
        user: userId,
        count: 1,
        status: 'pending',
        upcoming: isUpcoming,
        completedAt: null,
        readyForApproval: false,
      })
    setIsSubmitting(false)
    if (result?.ok) {
      toast.success('Activity added')
      setActivity('')
      setDate('')
      setDuration('')
      setDescription('')
    }
  }

  const isFormValid = useMemo(() => {
    if (!userId || !date) return false
    if (reportType === 'event') {
      return Boolean(eventName.trim())
    }
    return Boolean(activity.trim()) && Boolean(duration) && Number(duration) > 0
  }, [userId, date, reportType, eventName, activity, duration])

  return (
    <div className="user-board">
      <h3>Enter New Activity</h3>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="User ID"
          value={userId}
          readOnly
        />
        <select value={reportType} onChange={(e) => setReportType(e.target.value)}>
          <option value="activity">Activity</option>
          <option value="event">Event</option>
        </select>
        {reportType === 'activity' ? (
          <>
            <input
              type="text"
              placeholder="Activity"
              value={activity}
              onChange={(e) => setActivity(e.target.value)}
            />
            <input
              type="number"
              min="0"
              step="0.5"
              placeholder="Duration (hours)"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
          </>
        ) : (
          <input
            type="text"
            placeholder="Event Name"
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
          />
        )}
        <input
          type="date"
          value={date}
          min={today}
          max={reportType === 'event' ? today : undefined}
          readOnly={reportType === 'event'}
          onChange={(e) => handleDateChange(e.target.value)}
        />
        {reportType === 'activity' ? (
          <>
            <input
              type="text"
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </>
        ) : null}
        <button type="submit" disabled={!isFormValid || isSubmitting}>
          {isSubmitting ? 'Saving...' : reportType === 'event' ? 'Submit Event' : 'Add'}
        </button>
      </form>
    </div>
  )
}
