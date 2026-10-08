import { ArrowSquareOut, CaretRight, PencilSimple, Trash } from "@phosphor-icons/react";
import { Link } from "react-router-dom";
import "./ApplicationList.css";

function label(value) {
  return value ? value.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase()) : "Not provided";
}

function date(value) {
  return value ? new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value)) : "Not set";
}

function safeJobUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

function ApplicationList({ applications, deletingId, onEdit, onDelete }) {
  return (
    <div className="tracker-table-wrap">
      <table className="tracker-table">
        <thead><tr><th>Company</th><th>Position</th><th>Experience</th><th>Source</th><th>Resume version</th><th>Status</th><th>Applied on</th><th>Actions</th></tr></thead>
        <tbody>
          {applications.map((application) => {
            const jobUrl = safeJobUrl(application.job_url);
            const experience = application.experience_required || (application.experience_min != null || application.experience_max != null
              ? `${application.experience_min ?? "0"}–${application.experience_max ?? "+"} years`
              : "Not provided");
            return (
              <tr key={application.id}>
                <td data-label="Company"><strong className="tracker-company">{application.company_name}{jobUrl && <a href={jobUrl} target="_blank" rel="noopener noreferrer" aria-label={`Open saved link at ${application.company_name}`} title="Open saved job or application page"><ArrowSquareOut size={16} aria-hidden="true" /></a>}</strong></td>
                <td data-label="Position"><strong><Link className="tracker-position-link" to={`/interview-status?applicationId=${application.id}`} aria-label={`View interview status for ${application.job_title} at ${application.company_name}`}>{application.job_title}</Link></strong>{application.location && <span>{application.location}{application.work_mode ? ` · ${application.work_mode}` : ""}</span>}</td>
                <td data-label="Experience">{experience}</td>
                <td data-label="Source">{application.source || "Manual"}</td>
                <td data-label="Resume version">{application.resume_filename || "Not provided"}</td>
                <td data-label="Status"><Link className={`status-link status-${application.status}`} to={`/interview-status?applicationId=${application.id}`} aria-label={`View and update status for ${application.job_title} at ${application.company_name}`}>{label(application.status)}<CaretRight size={14} weight="bold" aria-hidden="true" /></Link></td>
                <td data-label="Applied on">{date(application.applied_at)}</td>
                <td className="tracker-table__actions" data-label="Actions">
                  <button type="button" onClick={() => onEdit(application)} aria-label="Edit application"><PencilSimple size={18} /></button>
                  <button type="button" onClick={() => onDelete(application.id)} disabled={deletingId === application.id} aria-label="Delete application"><Trash size={18} /></button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default ApplicationList;
