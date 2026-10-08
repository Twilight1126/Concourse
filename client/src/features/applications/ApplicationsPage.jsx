import { useEffect, useMemo, useState } from "react";
import { MagnifyingGlass, Plus } from "@phosphor-icons/react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { createApplication, deleteApplication, getApplication, getApplicationPage, updateApplication } from "../../api/applications";
import LoadingSkeleton from "../../components/LoadingSkeleton";
import { readCapture, toDateTimeInput } from "../../lib/capture";
import {
  publishApplicationDelete,
  publishApplicationUpsert,
  subscribeWorkspaceEvents,
} from "../../lib/workspace-events";
import { APPLICATION_STATUSES } from "../tracker-options";
import { subscribeToApplicationChanges } from "./application-sync";
import ApplicationForm from "./components/ApplicationForm";
import ApplicationList from "./components/ApplicationList";
import { useProfile } from "../profile/profile-context";
import { useAuth } from "../auth/auth-context";
import { clearSessionDraft } from "../../lib/use-session-draft";
import { invalidateRequestCache } from "../../api/client";
import { useActionFeedback } from "../../components/action-feedback-context";

const PAGE_SIZE = 10;

function captureValues(searchParams) {
  const capture = readCapture(searchParams);
  if (!capture || capture.type !== "application") return null;
  return {
    ...capture.data,
    applied_at: toDateTimeInput(capture.data?.applied_at),
    follow_up_at: "",
  };
}

function ApplicationsPage() {
  const { confirm, notify } = useActionFeedback();
  const { session } = useAuth();
  const { profile } = useProfile();
  const navigate = useNavigate();
  const location = useLocation();
  const { applicationId } = useParams();
  const [searchParams] = useSearchParams();
  const [applications, setApplications] = useState([]);
  const [editingRecord, setEditingRecord] = useState(null);
  const [editError, setEditError] = useState(null);
  const [total, setTotal] = useState(0);
  const [sources, setSources] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [loadedPage, setLoadedPage] = useState(1);
  const [reloadVersion, setReloadVersion] = useState(0);
  const editingApplication = applicationId && String(editingRecord?.id) === applicationId ? editingRecord : null;
  const showForm = location.pathname === "/applications/add" || Boolean(applicationId) || searchParams.get("new") === "true";
  const draftKey = `concourse:draft:application:${session.user.id}:${applicationId || `new:${searchParams.toString()}`}`;
  const capturedValues = useMemo(() => captureValues(searchParams), [searchParams]);
  const formValues = editingApplication ? {
    ...editingApplication,
    applied_at: toDateTimeInput(editingApplication.applied_at),
    follow_up_at: toDateTimeInput(editingApplication.follow_up_at),
  } : {
    salary_currency: profile?.currency || "INR",
    ...capturedValues,
    expected_salary: capturedValues?.expected_salary !== "" && capturedValues?.expected_salary != null
      ? capturedValues.expected_salary
      : profile?.expected_ctc ?? "",
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      const nextSearch = query.trim();
      if (nextSearch === search) return;
      setSearch(nextSearch);
      setCurrentPage(1);
      setIsLoading(true);
    }, 250);
    return () => clearTimeout(timeout);
  }, [query, search]);

  useEffect(() => {
    let active = true;
    getApplicationPage({ page: currentPage, search, status: statusFilter, source: sourceFilter })
      .then((result) => {
        if (!active) return;
        setApplications(result.items);
        setTotal(Number(result.total));
        setSources(result.sources);
        setLoadedPage(currentPage);
        setError(null);
        if (currentPage > 1 && (currentPage - 1) * PAGE_SIZE >= Number(result.total)) {
          setCurrentPage(Math.max(1, Math.ceil(Number(result.total) / PAGE_SIZE)));
        }
      })
      .catch((loadError) => { if (active) setError(loadError.message); })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [currentPage, search, statusFilter, sourceFilter, reloadVersion]);

  useEffect(() => {
    if (!applicationId) return;
    let active = true;
    getApplication(applicationId)
      .then((record) => { if (active) { setEditingRecord(record); setEditError(null); } })
      .catch(() => { if (active) setEditError(applicationId); });
    return () => { active = false; };
  }, [applicationId]);

  useEffect(() => {
    let timer;
    const refresh = (event) => {
      if (event.resource !== "applications") return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        invalidateRequestCache();
        setReloadVersion((version) => version + 1);
      }, 100);
    };
    const stopWorkspaceEvents = subscribeWorkspaceEvents(refresh);
    const stopDatabaseChanges = subscribeToApplicationChanges((event) => refresh({ resource: "applications", ...event }));
    return () => { clearTimeout(timer); stopWorkspaceEvents(); stopDatabaseChanges(); };
  }, []);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageStart = (loadedPage - 1) * PAGE_SIZE;

  async function handleSaveApplication(values) {
    setIsSubmitting(true);
    setError(null);
    try {
      const savedApplication = editingApplication
        ? await updateApplication(editingApplication.id, values)
        : await createApplication(values);
      publishApplicationUpsert(savedApplication);
      notify(editingApplication ? "Application updated" : "Application saved", editingApplication ? "updated" : "success");
      navigate("/applications");
      return true;
    } catch (createError) {
      setError(createError.message);
      notify("Could not save application.", "error");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteApplication(applicationId) {
    if (!await confirm({ title: "Delete application?", message: "This application and its journey history will be removed permanently." })) return;
    setDeletingId(applicationId);
    setError(null);
    try {
      await deleteApplication(applicationId);
      publishApplicationDelete(applicationId);
      notify("Application deleted", "deleted");
    } catch (deleteError) {
      setError(deleteError.message);
      notify("Could not delete application.", "error");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="app-shell applications-page">
      <header className="page-header">
        <div><h1>Applications</h1><p>Track every role and keep the next action clear.</p></div>
        {!showForm && <button className="button-primary" type="button" onClick={() => navigate("/applications/add")}><Plus size={18} weight="bold" />Add application</button>}
      </header>

      {showForm && (applicationId && !editingApplication && editError !== applicationId ? <LoadingSkeleton type="detail" label="Loading application" /> : applicationId && !editingApplication ? <p role="alert" className="inline-error">Application not found. <button type="button" onClick={() => navigate("/applications")}>Back to applications</button></p> : (
        <section className="application-create-panel">
          <div className="section-heading">
            <div><h2>{editingApplication ? "Edit application" : capturedValues ? "Review captured application" : "New application"}</h2><p>{capturedValues ? "Check the detected values before saving." : "Add the information available for this opportunity."}</p></div>
            <button className="button-secondary" type="button" onClick={() => { clearSessionDraft(draftKey); navigate("/applications"); }}>Cancel</button>
          </div>
          {error && <p role="alert" className="inline-error">{error}</p>}
          <ApplicationForm key={editingApplication?.id ?? searchParams.toString()} draftKey={draftKey} initialValues={formValues} onSave={handleSaveApplication} isSubmitting={isSubmitting} isEditing={Boolean(editingApplication)} />
        </section>
      ))}

      {!showForm && <section className="applications-panel" aria-labelledby="applications-heading">
        <div className="section-heading">
          <div><h2 id="applications-heading">Tracked applications</h2><p>{total} opportunities</p></div>
        </div>

        <div className="tracker-toolbar">
          <label className="tracker-search"><MagnifyingGlass size={18} /><span className="sr-only">Search applications</span><input value={query} onChange={(event) => { setQuery(event.target.value); setCurrentPage(1); }} placeholder="Search role, company, location or source" /></label>
          <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setCurrentPage(1); setIsLoading(true); }} aria-label="Filter by status"><option value="all">All statuses</option>{APPLICATION_STATUSES.map((status) => <option value={status} key={status}>{status.replaceAll("_", " ")}</option>)}</select>
          <select value={sourceFilter} onChange={(event) => { setSourceFilter(event.target.value); setCurrentPage(1); setIsLoading(true); }} aria-label="Filter by source"><option value="all">All sources</option>{sources.map((source) => <option value={source} key={source}>{source}</option>)}</select>
        </div>

        {isLoading && applications.length === 0 && <LoadingSkeleton label="Loading applications" />}
        {isLoading && applications.length > 0 && <p className="tracker-loading-note" role="status">Updating results…</p>}
        {error && <p role="alert" className="inline-error">{error}</p>}
        {!isLoading && !error && total === 0 && !search && statusFilter === "all" && sourceFilter === "all" && <p className="empty-state">No applications yet. Capture a job page with the extension or add one manually.</p>}
        {!isLoading && !error && total === 0 && (search || statusFilter !== "all" || sourceFilter !== "all") && <p className="empty-state">No applications match these filters.</p>}
        {applications.length > 0 && (
          <>
            <ApplicationList applications={applications} deletingId={deletingId} onEdit={(application) => navigate(`/applications/${application.id}/edit`)} onDelete={handleDeleteApplication} />
            <nav className="tracker-pagination" aria-label="Applications pagination">
              <span>Showing {pageStart + 1}–{Math.min(pageStart + applications.length, total)} of {total}</span>
              <div>
                <button type="button" disabled={isLoading || loadedPage === 1} onClick={() => { setIsLoading(true); setCurrentPage(loadedPage - 1); }}>Previous</button>
                <strong>Page {loadedPage} of {pageCount}</strong>
                <button type="button" disabled={isLoading || loadedPage === pageCount} onClick={() => { setIsLoading(true); setCurrentPage(loadedPage + 1); }}>Next</button>
              </div>
            </nav>
          </>
        )}
      </section>}
    </div>
  );
}

export default ApplicationsPage;
