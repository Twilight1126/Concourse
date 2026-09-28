import { useEffect, useState } from "react";
import { createApplication, deleteApplication, getApplications, updateApplication } from "./api/applications";
import ApplicationForm from "./features/applications/components/ApplicationForm";
import ApplicationList from './features/applications/components/ApplicationList'
import './App.css'

function App() {
  const [applications, setApplications] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [updatingId, setUpdatingId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  // GET: Logic (Load existing application when the page opens.)
  useEffect(() => {
    async function loadApplications() {
      try {
        const data = await getApplications();
        setApplications(data);
      } catch (error) {
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    }
    loadApplications();
  }, []);

  // POST: Logic (Create an application and add the returned row to the current list.)
  async function handleCreateApplication(formValues) {
    setIsSubmitting(true)
    setError(null)

    try {
      const newApplication = await createApplication(formValues)

      setApplications((currentApplications) => [
        newApplication,
        ...currentApplications,
      ])
      return true
    } catch (error) {
      setError(error.message)
      return false
    } finally {
      setIsSubmitting(false)
    }
  }
  // PATCH: Update one application and replace it in the current list.
  async function handleUpdateStatus(applicationId, status) {
    setUpdatingId(applicationId)
    setError(null)

    try {
      const updatedApplication = await updateApplication(applicationId, {
        status,
      })

      setApplications((currentApplications) =>
        currentApplications.map((application) => {
          if (application.id === updatedApplication.id) {
            return updatedApplication
          }

          return application
        }),
      )
    } catch (error) {
      setError(error.message)
    } finally {
      setUpdatingId(null)
    }
  }
  // DELETE: Remove one application from the server and current list.
  async function handleDeleteApplication(applicationId) {
    const shouldDelete = window.confirm('Delete this application?')

    if (!shouldDelete) {
      return
    }
    setDeletingId(applicationId)
    setError(null)

    try {
      await deleteApplication(applicationId)

      setApplications((currentApplications) =>
        currentApplications.filter(
          (application) => application.id !== applicationId,
        ),
      )
    } catch (error) {
      setError(error.message)
    } finally {
      setDeletingId(null)
    }
  }


  return (
    <main className="app-shell">
      <header className="page-header">
        <p className="eyebrow">Concourse</p>
        <h1>Job application tracker</h1>
        <p>Keep every opportunity and follow-up in one place.</p>
      </header>

      <section aria-labelledby="applications-heading">
        <h2 id="applications-heading">Applications</h2>

        <ApplicationForm
          onCreate={handleCreateApplication}
          isSubmitting={isSubmitting}
        />

        {isLoading && <p role="status">Loading applications…</p>}
        {error && <p role="alert">{error}</p>}

        {!isLoading && !error && applications.length === 0 && (
          <p>You have no applications to display.</p>
        )}

        {!isLoading && !error && applications.length > 0 && (
          <ApplicationList
            applications={applications}
            updatingId={updatingId}
            deletingId={deletingId}
            onStatusChange={handleUpdateStatus}
            onDelete={handleDeleteApplication}
          />
        )}
      </section>
    </main>
  )
}

export default App