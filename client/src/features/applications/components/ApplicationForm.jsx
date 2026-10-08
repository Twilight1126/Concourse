import { useSessionDraft } from "../../../lib/use-session-draft";
import "./ApplicationForm.css";

const EMPTY_FORM = {
  company_name: "", job_title: "", job_url: "", source: "", location: "",
  work_mode: "", employment_type: "", experience_min: "", experience_max: "",
  salary_min: "", salary_max: "", salary_currency: "INR", salary_period: "year",
  experience_required: "", salary_budget: "", resume_filename: "",
  expected_salary: "", status: "saved", applied_at: "", next_action: "",
  follow_up_at: "", notes: "", interview_stage: "", interview_at: "", rejection_reason: "",
};
const TRACKING_FIELDS = ["status", "applied_at", "next_action", "follow_up_at", "notes", "interview_stage", "interview_at", "rejection_reason"];

function Field({ label, children }) {
  return <label className="tracker-form__field"><span>{label}</span>{children}</label>;
}

function ApplicationForm({ draftKey, initialValues, onSave, isSubmitting, isEditing = false }) {
  const [values, setValues, clearDraft] = useSessionDraft(draftKey, { ...EMPTY_FORM, ...initialValues });

  function change(event) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    const payload = { ...values };
    if (isEditing) TRACKING_FIELDS.forEach((field) => delete payload[field]);
    if (await onSave(payload)) clearDraft();
  }

  return (
    <form className="tracker-form" onSubmit={submit}>
      <div className="tracker-form__section">
        <div className="tracker-form__section-heading"><h3>Role</h3><p>Required details for every application.</p></div>
        <div className="tracker-form__grid">
          <Field label="Company name *"><input name="company_name" value={values.company_name} onChange={change} required /></Field>
          <Field label="Job title *"><input name="job_title" value={values.job_title} onChange={change} required /></Field>
          <Field label="Job URL"><input name="job_url" type="url" value={values.job_url} onChange={change} /></Field>
          <Field label="Source"><input name="source" value={values.source} onChange={change} placeholder="LinkedIn, Naukri, company portal" /></Field>
          <Field label="Location"><input name="location" value={values.location} onChange={change} /></Field>
          <Field label="Work mode"><select name="work_mode" value={values.work_mode} onChange={change}><option value="">Not provided</option><option>On-site</option><option>Hybrid</option><option>Remote</option></select></Field>
          <Field label="Employment type"><select name="employment_type" value={values.employment_type} onChange={change}><option value="">Not provided</option><option>Full-time</option><option>Part-time</option><option>Contract</option><option>Internship</option></select></Field>
        </div>
      </div>

      <div className="tracker-form__section">
        <div className="tracker-form__section-heading"><h3>Experience and compensation</h3><p>Complete only when the posting provides these values.</p></div>
        <div className="tracker-form__grid">
          <Field label="Experience required"><input name="experience_required" value={values.experience_required} onChange={change} placeholder="For example, 2–4 years" /></Field>
          <Field label="Published salary budget"><input name="salary_budget" value={values.salary_budget} onChange={change} placeholder="As written in the job post" /></Field>
          <Field label="Your expected salary"><input name="expected_salary" type="number" min="0" step="1" value={values.expected_salary} onChange={change} /></Field>
          <Field label="Resume / CV used"><input name="resume_filename" value={values.resume_filename} onChange={change} /></Field>
        </div>
      </div>

      <div className="tracker-form__actions">
        <button className="button-primary" type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving…" : isEditing ? "Save changes" : "Add application"}</button>
      </div>
    </form>
  );
}

export default ApplicationForm;
