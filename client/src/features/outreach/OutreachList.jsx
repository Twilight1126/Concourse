import { ArrowSquareOut, PencilSimple, Trash } from "@phosphor-icons/react";
import { OUTREACH_STATUSES } from "../tracker-options";
const date = (value) => value ? new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value)) : "Not set";
const label = (value) => value.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());

export default function OutreachList({ records, applications, updatingId, deletingId, onStatusChange, onEdit, onDelete }) {
  const applicationsById = new Map(applications.map((application) => [String(application.id), application]));
  return (
    <div className="tracker-table-wrap">
      <table className="tracker-table outreach-table">
        <thead><tr><th>Contact</th><th>Company</th><th>Outreach</th><th>Resume</th><th>Status</th><th>Sent on</th><th><span className="sr-only">Actions</span></th></tr></thead>
        <tbody>{records.map((record) => {
          const application = applicationsById.get(String(record.related_application_id));
          return <tr key={record.id}>
            <td data-label="Contact"><strong>{record.contact_name || record.contact_email}</strong><span>{record.contact_email}</span></td>
            <td data-label="Company"><strong>{record.company_name}</strong><span>{record.contact_title || "Position not provided"}</span></td>
            <td data-label="Outreach"><strong>{record.subject}</strong><span>{application ? `${application.job_title} · ${application.company_name}` : record.outreach_type || "General outreach"}</span></td>
            <td data-label="Resume">{record.resume_filename || "Not attached"}</td>
            <td data-label="Status"><select className={`status-select status-${record.status}`} value={record.status} disabled={updatingId === record.id} onChange={(event) => onStatusChange(record.id, event.target.value)} aria-label={`Status for outreach to ${record.contact_email}`}>{OUTREACH_STATUSES.filter((status) => status !== "follow_up_due" || record.status === "follow_up_due").map((status) => <option key={status} value={status}>{label(status)}</option>)}</select></td>
            <td data-label="Sent on">{date(record.sent_at)}</td>
            <td className="tracker-table__actions">{record.linkedin_url && <a href={record.linkedin_url} target="_blank" rel="noreferrer" aria-label="Open LinkedIn profile"><ArrowSquareOut size={18} /></a>}<button type="button" onClick={() => onEdit(record)} aria-label="Edit outreach"><PencilSimple size={18} /></button><button type="button" disabled={deletingId === record.id} onClick={() => onDelete(record.id)} aria-label="Delete outreach"><Trash size={18} /></button></td>
          </tr>;
        })}</tbody>
      </table>
    </div>
  );
}
