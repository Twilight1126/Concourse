import './ApplicationList.css'

// Keep these choices aligned with the statuses accepted by the API.
const APPLICATION_STATUSES = [
  'saved',
  'applied',
  'screening',
  'interviewing',
  'offered',
  'rejected',
  'ghosted',
  'withdrawn',
]

function ApplicationList({ applications, updatingId, deletingId, onStatusChange, onDelete, }) {
  return (
    <ul className="application-list">
      {applications.map((application) => (
        <li className="application-list__item" key={application.id}>
          <strong>{application.company_name}</strong>
          <span>{application.job_title}</span>
          <label className="application-list__status">
            {updatingId === application.id ? 'Updating…' : 'Status'}
            <select
              value={application.status}
              disabled={
                updatingId === application.id ||
                deletingId === application.id
              }
              onChange={(event) =>
                onStatusChange(application.id, event.target.value)
              }
            >
              {APPLICATION_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={deletingId === application.id}
            onClick={() => onDelete(application.id)}
          >
            {deletingId === application.id ? 'Deleting…' : 'Delete'}
          </button>
        </li>
      ))}
    </ul>
  )
}
export default ApplicationList