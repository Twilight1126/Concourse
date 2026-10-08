import { useEffect, useState } from "react";
import { CaretLeft, CheckCircle, PencilSimple, Trash } from "@phosphor-icons/react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createApplicationUpdate, deleteApplicationUpdate, editApplicationUpdate, getApplication, getApplicationUpdates, updateApplication } from "../../api/applications";
import { toDateTimeInput } from "../../lib/capture";
import { publishApplicationUpsert } from "../../lib/workspace-events";
import { APPLICATION_STATUSES } from "../tracker-options";
import { useAuth } from "../auth/auth-context";
import LoadingSkeleton from "../../components/LoadingSkeleton";
import { useActionFeedback } from "../../components/action-feedback-context";
import { useSessionDraft } from "../../lib/use-session-draft";
import "./TrackingStatusPage.css";

const PATH = ["saved", "applied", "screening", "interviewing", "offered"];
const CLOSED = new Set(["rejected", "ghosted", "withdrawn"]);
const label = (status) => status === "interviewing" ? "Interview" : status.replace(/^./, (letter) => letter.toUpperCase());
const date = (value) => value && !Number.isNaN(new Date(value).getTime()) ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Not recorded";
const emptyUpdate = () => ({ title: "", happened_at: toDateTimeInput(new Date()), details: "" });

export default function TrackingStatusPage() {
  const { confirm, notify } = useActionFeedback();
  const { session } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const applicationId = searchParams.get("applicationId");
  const requestedStatus = searchParams.get("status");
  const [draft, setDraft, clearDraft, setDraftBaseline] = useSessionDraft(
    `concourse:draft:journey:${session.user.id}:${applicationId}`,
    { selectedStatus: null, values: emptyUpdate(), editingId: null, reason: "" },
  );
  const { selectedStatus, values, editingId, reason } = draft;
  function updateDraft(field, next) {
    setDraft((current) => ({ ...current, [field]: typeof next === "function" ? next(current[field]) : next }));
  }
  const setSelectedStatus = (next) => updateDraft("selectedStatus", next);
  const setValues = (next) => updateDraft("values", next);
  const setEditingId = (next) => updateDraft("editingId", next);
  const setReason = (next) => updateDraft("reason", next);
  const [application, setApplication] = useState(null);
  const [updates, setUpdates] = useState([]);
  const [dateInputVersion, setDateInputVersion] = useState(0);
  const [loading, setLoading] = useState(Boolean(applicationId));
  const [historyUnavailable, setHistoryUnavailable] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const pendingRejection = !editingId && selectedStatus === "rejected" && application?.status !== "rejected";
  const changingStatus = Boolean(!editingId && application && selectedStatus && selectedStatus !== application.status);
  const allowedTransition = selectedStatus !== "saved"
    && (application?.status !== "saved" || ["applied", "withdrawn"].includes(selectedStatus));
  const validDate = values.happened_at && !Number.isNaN(new Date(values.happened_at).getTime());
  const eventReady = Boolean(values.title.trim() && validDate
    && (editingId || allowedTransition && (!changingStatus || values.details.trim()))
    && (selectedStatus !== "rejected" || reason.trim()));

  useEffect(() => {
    if (!applicationId) return;
    let active = true;
    getApplication(applicationId)
      .then(async (record) => {
        if (!active) return;
        setApplication(record);
        setDraftBaseline((current) => ({
          ...current,
          selectedStatus: current.selectedStatus || (requestedStatus === "rejected" ? "rejected" : record.status),
          reason: current.reason || record.rejection_reason || "",
        }));
        setError(null);
        try {
          const history = await getApplicationUpdates(applicationId);
          if (active) { setUpdates(history); setHistoryUnavailable(false); }
        } catch {
          if (active) {
            setHistoryUnavailable(true);
            setError("Stage history could not load. Restart the Concourse server, then refresh this page.");
          }
        }
      })
      .catch((loadError) => { if (active) setError(loadError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [applicationId, requestedStatus, setDraftBaseline]);

  function beginEdit(update) {
    setDateInputVersion((version) => version + 1);
    setEditingId(update.id);
    setSelectedStatus(update.status);
    if (update.status === "rejected") setReason(application.rejection_reason || "");
    setValues({ title: update.title, happened_at: toDateTimeInput(update.happened_at), details: update.details || "" });
    setError(null);
    window.requestAnimationFrame(() => document.getElementById("application-update-form")?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
  }

  function cancelEdit() {
    setDateInputVersion((version) => version + 1);
    setEditingId(null);
    setSelectedStatus(application.status);
    setValues(emptyUpdate());
    setError(null);
    clearDraft();
  }

  async function removeUpdate(update) {
    if (!await confirm({ title: "Delete update?", message: `“${update.title}” will be removed from this application's history.` })) return;
    setError(null);
    try {
      await deleteApplicationUpdate(applicationId, update.id);
      setUpdates((current) => current.filter((item) => item.id !== update.id));
      if (editingId === update.id) cancelEdit();
      notify("Update deleted", "deleted");
    } catch (deleteError) { setError(deleteError.message); notify("Could not delete update.", "error"); }
  }

  async function saveEvent(event) {
    event.preventDefault();
    if (!application || !eventReady || saving) return;
    setSaving(true);
    setError(null);
    let stageSaved = false;
    try {
      const payload = { ...values, happened_at: new Date(values.happened_at).toISOString() };
      if (changingStatus || selectedStatus === "rejected" && reason.trim() !== (application.rejection_reason || "")) {
        const updated = await updateApplication(applicationId, {
          ...(changingStatus ? { status: selectedStatus } : {}),
          ...(selectedStatus === "applied" ? { applied_at: payload.happened_at } : {}),
          ...(selectedStatus === "rejected" ? { rejection_reason: reason.trim() } : {}),
          ...(changingStatus && CLOSED.has(selectedStatus) ? { next_action: "", follow_up_at: "" } : {}),
        });
        setApplication(updated);
        publishApplicationUpsert(updated);
        stageSaved = true;
      }
      const saved = editingId
        ? await editApplicationUpdate(applicationId, editingId, payload)
        : await createApplicationUpdate(applicationId, payload);
      setUpdates((current) => [saved, ...current.filter((item) => item.id !== saved.id)]
        .sort((a, b) => new Date(b.happened_at) - new Date(a.happened_at) || Number(b.id) - Number(a.id)));
      setEditingId(null);
      setSelectedStatus(changingStatus ? selectedStatus : application.status);
      setValues(emptyUpdate());
      setDateInputVersion((version) => version + 1);
      clearDraft();
      notify(editingId ? "Update saved" : "Update added", editingId ? "updated" : "success");
      if (pendingRejection) navigate(`/interview-status?applicationId=${applicationId}`, { replace: true });
    } catch (saveError) {
      notify(stageSaved ? "Stage changed, but update could not be saved." : "Could not save update.", "error");
      setError(stageSaved
        ? `Stage changed, but the update was not saved. Try Save update again: ${saveError.message}`
        : saveError.message);
    }
    finally { setSaving(false); }
  }

  if (!applicationId) return <div className="app-shell"><p role="alert" className="inline-error">Choose an application from Applications to see its status.</p></div>;
  const currentStatus = application?.status;
  const closed = CLOSED.has(currentStatus);
  const reachedIndex = closed
    ? Math.max(application.interview_at ? 3 : application.applied_at ? 1 : 0,
      ...updates.map((update) => PATH.indexOf(update.status)))
    : PATH.indexOf(currentStatus);
  const visiblePath = closed ? [...PATH.slice(0, reachedIndex + 1), currentStatus] : PATH;
  const currentIndex = closed ? visiblePath.length - 1 : reachedIndex;

  return <div className="app-shell tracking-status-page">
    <header className="page-header tracking-status-header"><div><h1>Application journey</h1><p>See this role’s progress and record updates as they happen.</p></div><button className="button-primary tracking-status-back" type="button" onClick={() => navigate("/applications")}><CaretLeft size={16} weight="bold" />Applications</button></header>
    {loading && <LoadingSkeleton type="detail" label="Loading application journey" />}
    {error && <p role="alert" className="inline-error">{error}</p>}
    {!loading && !application && !error && <p role="alert" className="inline-error">Application not found.</p>}
    {application && <div className="tracking-status-scroll">
      <section className="tracking-status-panel tracking-status-journey" aria-labelledby="journey-heading">
        <div className="tracking-status-section-head"><div><h2 id="journey-heading">{application.job_title}</h2><p>{application.company_name}</p></div><span className={`tracking-status-badge status-${currentStatus}`}>{label(currentStatus)}</span></div>
        <ol className="tracking-status-path" aria-label="Application stages" style={{ "--stage-count": visiblePath.length }}>{visiblePath.map((step, index) => <li key={step} className={`tracking-status-path__step${currentIndex === index ? ` is-current status-${step}` : ""}${currentIndex > index ? " is-complete" : ""}`} aria-current={currentIndex === index ? "step" : undefined}><span aria-hidden="true">{currentIndex === index ? closed ? "✕" : ["📌", "📨", "🔎", "💬", "🎉"][index] : currentIndex > index ? <CheckCircle size={17} weight="fill" /> : String(index + 1).padStart(2, "0")}</span><strong>{label(step)}</strong></li>)}</ol>
        <div className="tracking-status-summary"><div><span>Application sent</span><strong>{date(application.applied_at)}</strong></div><div><span>Current status</span><strong>{label(application.status)}</strong></div></div>
        {closed && <div className={`tracking-status-outcome status-${currentStatus}`} role="status"><strong>{label(currentStatus)} · application closed</strong><span>{currentStatus === "rejected" ? application.rejection_reason || "Record the reason the employer shared, or choose Reason not shared." : currentStatus === "ghosted" ? "No further response. This application has ended." : "This application has ended."}</span></div>}
      </section>

      {!historyUnavailable && <div className="tracking-status-workspace">
        <div className="tracking-status-side">
          <p className="tracking-status-guide">Change the stage when you hear news. Keep the same stage to record another round.</p>
          <form id="application-update-form" className="tracking-status-panel tracking-status-form" onSubmit={saveEvent}>
            <div className="tracking-status-section-head"><div><h2>{editingId ? "Edit update" : "Change stage"}</h2><p>Record what happened and when.</p></div></div>
            <label className="tracking-status-field"><span>Stage</span><select value={selectedStatus || application.status} disabled={Boolean(editingId)} onChange={(event) => { setSelectedStatus(event.target.value); setError(null); }}>{APPLICATION_STATUSES.map((status) => <option key={status} value={status}>{label(status)}</option>)}</select></label>
            <div className="tracking-status-fields">
              <label className="tracking-status-field"><span>What happened?</span><input required maxLength="150" value={values.title} onChange={(event) => setValues((current) => ({ ...current, title: event.target.value }))} placeholder="For example, interview round 2" /></label>
              <label className="tracking-status-field"><span>When did it happen?</span><input key={dateInputVersion} required type="datetime-local" defaultValue={values.happened_at} onChange={(event) => setValues((current) => ({ ...current, happened_at: event.target.value }))} /></label>
              {selectedStatus === "rejected" && <label className="tracking-status-field is-wide"><span>Employer’s reason</span><textarea required maxLength="500" rows="2" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Reason shared by the employer" /><button className="tracking-status-text-button" type="button" onClick={() => setReason("Not shared by employer")}>Reason not shared</button></label>}
              <label className="tracking-status-field is-wide"><span>Details {changingStatus ? "" : <small>optional</small>}</span><textarea required={changingStatus} rows="2" maxLength="5000" value={values.details} onChange={(event) => setValues((current) => ({ ...current, details: event.target.value }))} placeholder={changingStatus ? "What changed, and why?" : "A short summary or what to prepare next"} /></label>
            </div>
            <div className="tracking-status-actions"><p>{editingId ? "Edit this update without changing its stage." : !allowedTransition ? application.status === "saved" ? "Mark the application Applied before recording later stages." : "Choose a stage other than Saved." : changingStatus ? "This will change the application’s stage." : "This adds another update at the current stage."}</p>{editingId && <button className="button-secondary" type="button" onClick={cancelEdit}>Cancel</button>}<button className="button-primary" type="submit" disabled={saving || !eventReady}>{saving ? "Saving…" : editingId ? "Save changes" : changingStatus ? "Update status" : "Save update"}</button></div>
          </form>
        </div>
        <section className="tracking-status-panel tracking-status-history" aria-labelledby="history-heading"><div className="tracking-status-section-head"><div><h2 id="history-heading">Updates</h2><p>Calls, interviews, and outcomes in date order.</p></div><span className="tracking-status-count">{updates.length}</span></div>
          {updates.length === 0 ? <p className="tracking-status-empty">No updates yet. Record the first event when it happens.</p> : <ol className="tracking-status-updates">{updates.map((update) => <li key={update.id}><span className={`tracking-status-update-dot status-${update.status}`} aria-hidden="true" /><div className="tracking-status-update-body"><div className="tracking-status-update-head"><span className={`tracking-status-update-stage status-${update.status}`}>{label(update.status)}</span><time dateTime={update.happened_at}>{date(update.happened_at)}</time></div><h3>{update.title}</h3>{update.details && <p>{update.details}</p>}</div><div className="tracking-status-update-actions"><button type="button" onClick={() => beginEdit(update)} aria-label={`Edit ${update.title}`} title="Edit update"><PencilSimple size={18} /></button><button type="button" onClick={() => removeUpdate(update)} aria-label={`Delete ${update.title}`} title="Delete update"><Trash size={18} /></button></div></li>)}</ol>}
        </section>
      </div>}
    </div>}
  </div>;
}
