import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { createApplication, deleteApplication, getApplications, updateApplication } from "../../api/applications";
import ApplicationForm from "./components/ApplicationForm";
import ApplicationList from "./components/ApplicationList";

function ApplicationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const showForm = searchParams.get("new") === "true";

  useEffect(() => {
    async function loadApplications() {
      try {
        setApplications(await getApplications());
      } catch (loadError) {
        setError(loadError.message);
      } finally {
        setIsLoading(false);
      }
    }

    loadApplications();
  }, []);

  async function handleCreateApplication(formValues) {
    setIsSubmitting(true);
    setError(null);

    try {
      const newApplication = await createApplication(formValues);
      setApplications((current) => [newApplication, ...current]);
      setSearchParams({});
      return true;
    } catch (createError) {
      setError(createError.message);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUpdateStatus(applicationId, status) {
    setUpdatingId(applicationId);
    setError(null);

    try {
      const updated = await updateApplication(applicationId, { status });
      setApplications((current) => current.map((item) => item.id === updated.id ? updated : item));
    } catch (updateError) {
      setError(updateError.message);
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleDeleteApplication(applicationId) {
    if (!window.confirm("Delete this application?")) return;

    setDeletingId(applicationId);
    setError(null);

    try {
      await deleteApplication(applicationId);
      setApplications((current) => current.filter((item) => item.id !== applicationId));
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="app-shell">
      <header className="page-header">
        <div>
          <h1>Applications</h1>
          <p>Track every role and keep the next action clear.</p>
        </div>
        {!showForm && (
          <button className="button-primary" type="button" onClick={() => setSearchParams({ new: "true" })}>
            Add application
          </button>
        )}
      </header>

      {showForm && (
        <section className="application-create-panel">
          <div className="section-heading">
            <div><h2>New application</h2><p>Add the essential details now. Extension capture arrives in the next feature.</p></div>
            <button className="button-secondary" type="button" onClick={() => setSearchParams({})}>Cancel</button>
          </div>
          <ApplicationForm onCreate={handleCreateApplication} isSubmitting={isSubmitting} />
        </section>
      )}

      <section className="applications-panel" aria-labelledby="applications-heading">
        <div className="section-heading">
          <div><h2 id="applications-heading">Tracked applications</h2><p>{applications.length} opportunities in this workspace</p></div>
        </div>

        {isLoading && <div className="list-skeleton" aria-label="Loading applications"><span /><span /><span /></div>}
        {error && <p role="alert" className="inline-error">{error}</p>}
        {!isLoading && !error && applications.length === 0 && <p className="empty-state">No applications yet. Add your first opportunity to begin.</p>}
        {!isLoading && !error && applications.length > 0 && (
          <ApplicationList applications={applications} updatingId={updatingId} deletingId={deletingId} onStatusChange={handleUpdateStatus} onDelete={handleDeleteApplication} />
        )}
      </section>
    </div>
  );
}

export default ApplicationsPage;
