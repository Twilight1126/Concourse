import { useEffect, useMemo, useState } from "react";
import { MagnifyingGlass, PaperPlaneTilt, Plus } from "@phosphor-icons/react";
import { useSearchParams } from "react-router-dom";
import { getApplications } from "../../api/applications";
import LoadingSkeleton from "../../components/LoadingSkeleton";
import { useActionFeedback } from "../../components/action-feedback-context";
import { createOutreach, deleteOutreach, getOutreach, updateOutreach } from "../../api/outreach";
import { readCapture, toDateTimeInput } from "../../lib/capture";
import { OUTREACH_STATUSES } from "../tracker-options";
import OutreachForm from "./OutreachForm";
import OutreachList from "./OutreachList";
import "../applications/components/ApplicationForm.css";
import "../applications/components/ApplicationList.css";
import "./OutreachTracker.css";

function captureValues(searchParams) {
  const capture = readCapture(searchParams);
  if (!capture || capture.type !== "outreach") return null;
  return {
    ...capture.data,
    sent_at: toDateTimeInput(capture.data?.sent_at),
    follow_up_at: "",
  };
}

export default function OutreachTracker() {
  const { confirm, notify } = useActionFeedback();
  const [searchParams, setSearchParams] = useSearchParams();
  const [records, setRecords] = useState([]);
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [editingRecord, setEditingRecord] = useState(null);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const showForm = searchParams.get("new") === "true" || editingRecord !== null;
  const capturedValues = useMemo(() => captureValues(searchParams), [searchParams]);
  const formValues = editingRecord ? {
    ...editingRecord,
    sent_at: toDateTimeInput(editingRecord.sent_at),
    follow_up_at: toDateTimeInput(editingRecord.follow_up_at),
  } : capturedValues;

  useEffect(() => {
    Promise.all([getOutreach(), getApplications()])
      .then(([outreach, applicationRecords]) => {
        setRecords(outreach);
        setApplications(applicationRecords);
      })
      .catch((loadError) => setError(loadError.message))
      .finally(() => setIsLoading(false));
  }, []);

  const filteredRecords = useMemo(() => {
    const search = query.trim().toLowerCase();
    return records.filter((record) => {
      const matchesSearch = !search || [
        record.contact_name, record.contact_email, record.contact_title,
        record.company_name, record.subject, record.resume_filename,
      ].some((value) => value?.toLowerCase().includes(search));
      return matchesSearch && (statusFilter === "all" || record.status === statusFilter);
    });
  }, [query, records, statusFilter]);

  async function handleCreate(values) {
    setIsSubmitting(true);
    setError(null);
    try {
      const record = editingRecord
        ? await updateOutreach(editingRecord.id, values)
        : await createOutreach(values);
      setRecords((current) => editingRecord
        ? current.map((item) => item.id === record.id ? record : item)
        : [record, ...current]);
      setEditingRecord(null);
      setSearchParams({});
      notify(editingRecord ? "Outreach updated" : "Outreach saved", editingRecord ? "updated" : "success");
      return true;
    } catch (createError) {
      setError(createError.message);
      notify("Could not save outreach.", "error");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleStatusChange(id, status) {
    setUpdatingId(id);
    try {
      const updated = await updateOutreach(id, { status });
      setRecords((current) => current.map((record) => record.id === updated.id ? updated : record));
      notify("Status updated", "updated");
    } catch (updateError) {
      setError(updateError.message);
      notify("Could not update status.", "error");
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleDelete(id) {
    if (!await confirm({ title: "Delete outreach?", message: "This outreach record will be removed permanently." })) return;
    setDeletingId(id);
    try {
      await deleteOutreach(id);
      setRecords((current) => current.filter((record) => record.id !== id));
      notify("Outreach deleted", "deleted");
    } catch (deleteError) {
      setError(deleteError.message);
      notify("Could not delete outreach.", "error");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className={`app-shell outreach-page${showForm ? " has-form" : ""}`}>
      <header className="page-header">
        <div><h1>Outreach</h1><p>Track cold emails and referral requests without storing message bodies.</p></div>
        {!showForm && <button className="button-primary" type="button" onClick={() => { setEditingRecord(null); setSearchParams({ new: "true" }); }}><Plus size={18} weight="bold" />Add outreach</button>}
      </header>

      {!showForm && <section className="outreach-preview__stage" aria-labelledby="outreach-preview-heading">
        <div className="outreach-preview__mark"><PaperPlaneTilt size={25} weight="light" aria-hidden="true" /></div>
        <div><h2 id="outreach-preview-heading">Outreach upgrades are dropping soon.</h2><p>Smarter ways to find the right people and keep conversations moving.</p></div>
      </section>}

      {showForm && <section className="application-create-panel">
        <div className="section-heading"><div><h2>{editingRecord ? "Edit outreach" : capturedValues ? "Review captured outreach" : "New outreach"}</h2><p>{capturedValues ? "Check the Gmail metadata before saving." : "Add the contact and message metadata."}</p></div><button className="button-secondary" type="button" onClick={() => { setEditingRecord(null); setSearchParams({}); }}>Cancel</button></div>
        <OutreachForm key={editingRecord?.id ?? searchParams.toString()} initialValues={formValues} applications={applications} isSubmitting={isSubmitting} onCreate={handleCreate} />
      </section>}

      <section className="applications-panel" aria-labelledby="outreach-heading">
        <div className="section-heading"><div><h2 id="outreach-heading">Tracked outreach</h2><p>{filteredRecords.length} of {records.length} conversations</p></div></div>
        <div className="tracker-toolbar">
          <label className="tracker-search"><MagnifyingGlass size={18} /><span className="sr-only">Search outreach</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search contact, company, email or subject" /></label>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter by status"><option value="all">All statuses</option>{OUTREACH_STATUSES.filter((status) => status !== "follow_up_due").map((status) => <option value={status} key={status}>{status.replaceAll("_", " ")}</option>)}</select>
        </div>
        {isLoading && <LoadingSkeleton label="Loading outreach" />}
        {error && <p role="alert" className="inline-error">{error}</p>}
        {!isLoading && !error && records.length === 0 && <p className="empty-state">No outreach yet. Compose in Gmail with the extension or add a record manually.</p>}
        {!isLoading && !error && records.length > 0 && filteredRecords.length === 0 && <p className="empty-state">No outreach matches these filters.</p>}
        {!isLoading && !error && filteredRecords.length > 0 && <OutreachList records={filteredRecords} applications={applications} updatingId={updatingId} deletingId={deletingId} onStatusChange={handleStatusChange} onEdit={(record) => { setEditingRecord(record); setSearchParams({}); }} onDelete={handleDelete} />}
      </section>
    </div>
  );
}
