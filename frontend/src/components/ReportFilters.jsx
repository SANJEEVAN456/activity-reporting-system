import { toast } from 'react-toastify'
import '../styles/report.css'

export default function ReportFilters({
  filterDate,
  filterActivity,
  setFilterDate,
  setFilterActivity,
  applyFilters,
  activityOptions = [],
  dateOptions = [],
  filteredReports = [],
}) {
  return (
    <div className="report-filters">
      <div className="report-header">
        <h3>Filters</h3>
      </div>
      <div className="filters">
        <input
          type="date"
          value={filterDate}
          list="filter-date-options"
          onChange={(e) => setFilterDate(e.target.value)}
        />
        <input
          type="text"
          placeholder="Filter by activity"
          value={filterActivity}
          list="filter-activity-options"
          onChange={(e) => setFilterActivity(e.target.value)}
        />
        <datalist id="filter-activity-options">
          {activityOptions.map((item) => (
            <option key={item} value={item} />
          ))}
        </datalist>
        <datalist id="filter-date-options">
          {dateOptions.map((item) => (
            <option key={item} value={item} />
          ))}
        </datalist>
      </div>
      <button
        type="button"
        className="filter-search-btn"
        onClick={() => {
          applyFilters()
          toast.info('Filters applied')
        }}
      >
        Search
      </button>
      <div className="filter-results">
        <h4>Filtered Results</h4>
        {filteredReports.length === 0 ? (
          <p className="empty-inline">No results.</p>
        ) : (
          <div className="filter-results-scroll">
            <div className="filter-results-table">
              <div className="filter-results-row header">
                <span>Date</span>
                <span>Activity</span>
                <span>Hours</span>
                <span>Status</span>
                <span>Admin Approval</span>
              </div>
              {filteredReports.map((r) => (
                <div key={r.id} className="filter-results-row">
                  <span>{r.date || '-'}</span>
                  <span>{r.activity || '-'}</span>
                  <span>{r.duration || 0}</span>
                  <span>{r.status || 'pending'}</span>
                  <span>{r.reviewStatus || '-'}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
