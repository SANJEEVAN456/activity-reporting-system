import { useState } from 'react'
import '../styles/report.css'

export default function ReportForm() {
  const [activity, setActivity] = useState('')
  const [date, setDate] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    alert(`Report submitted: ${activity} on ${date}`)
  }

  return (
    <form className="report-form" onSubmit={handleSubmit}>
      <input type="text" placeholder="Activity" value={activity}
        onChange={(e) => setActivity(e.target.value)} />
      <input type="date" value={date}
        onChange={(e) => setDate(e.target.value)} />
      <button type="submit">Submit Report</button>
    </form>
  )
}
