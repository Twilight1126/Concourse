import { useState } from "react";

const EMPTY = {
  contact_name: "", contact_title: "", company_name: "", contact_email: "",
  sender_email: "", subject: "", resume_filename: "", linkedin_url: "",
  source: "Gmail", contact_source: "", outreach_type: "Referral request",
  related_application_id: "", status: "draft", sent_at: "", follow_up_at: "", notes: "",
};

function Field({ label, children }) {
  return <label className="tracker-form__field"><span>{label}</span>{children}</label>;
}

export default function OutreachForm({ initialValues, applications, isSubmitting, onCreate }) {
  const [values, setValues] = useState({ ...EMPTY, ...initialValues });
  function change(event) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    if (await onCreate(values)) setValues(EMPTY);
  }

  return (
    <form className="tracker-form" onSubmit={submit}>
      <div className="tracker-form__section">
        <div className="tracker-form__section-heading"><h3>Contact</h3><p>Professional details about the person you are contacting.</p></div>
        <div className="tracker-form__grid">
          <Field label="Contact name"><input name="contact_name" value={values.contact_name} onChange={change} /></Field>
          <Field label="Position"><input name="contact_title" value={values.contact_title} onChange={change} /></Field>
          <Field label="Company *"><input name="company_name" value={values.company_name} onChange={change} required /></Field>
          <Field label="Official email *"><input name="contact_email" type="email" value={values.contact_email} onChange={change} required /></Field>
          <Field label="LinkedIn profile"><input name="linkedin_url" type="url" value={values.linkedin_url} onChange={change} /></Field>
          <Field label="Contact source"><input name="contact_source" value={values.contact_source} onChange={change} placeholder="LinkedIn" /></Field>
        </div>
      </div>

      <div className="tracker-form__section">
        <div className="tracker-form__section-heading"><h3>Email metadata</h3><p>Concourse never captures or stores the message body.</p></div>
        <div className="tracker-form__grid">
          <Field label="Sending email *"><input name="sender_email" type="email" value={values.sender_email} onChange={change} required /></Field>
          <Field label="Subject *"><input name="subject" value={values.subject} onChange={change} required /></Field>
          <Field label="Resume filename"><input name="resume_filename" value={values.resume_filename} onChange={change} /></Field>
          <Field label="Outreach type"><select name="outreach_type" value={values.outreach_type} onChange={change}><option>Referral request</option><option>Cold outreach</option><option>Recruiter follow-up</option><option>Networking</option></select></Field>
          <Field label="Related application"><select name="related_application_id" value={values.related_application_id} onChange={change}><option value="">None</option>{applications.map((application) => <option key={application.id} value={application.id}>{application.job_title} · {application.company_name}</option>)}</select></Field>
        </div>
      </div>

      <div className="tracker-form__section">
        <div className="tracker-form__section-heading"><h3>Tracking</h3><p>Update the status as the conversation progresses.</p></div>
        <div className="tracker-form__grid">
          <Field label="Status"><select name="status" value={values.status} onChange={change}><option value="draft">Draft</option><option value="sent">Sent</option>{values.status === "follow_up_due" && <option value="follow_up_due">Follow-up due</option>}<option value="replied">Replied</option><option value="closed">Closed</option></select></Field>
          <Field label="Sent on"><input name="sent_at" type="datetime-local" value={values.sent_at} onChange={change} /></Field>
          <Field label="Notes"><textarea name="notes" rows="3" value={values.notes} onChange={change} /></Field>
        </div>
      </div>

      <div className="tracker-form__actions"><button className="button-primary" type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving…" : "Save outreach"}</button></div>
    </form>
  );
}
