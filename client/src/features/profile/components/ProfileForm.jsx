import { cloneElement, useState } from "react";
import { ArrowRight, CheckCircle, UserCircle } from "@phosphor-icons/react";
import "./ProfileForm.css";

function detectedTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

function googleName(identity) {
  return identity?.user_metadata?.full_name ?? identity?.user_metadata?.name ?? "";
}

function googleAvatar(identity) {
  return identity?.user_metadata?.avatar_url ?? identity?.user_metadata?.picture ?? "";
}

function initialValues(profile, identity) {
  return {
    display_name: profile?.display_name ?? googleName(identity),
    phone: profile?.phone ?? "",
    location: profile?.location ?? "",
    timezone: profile?.timezone ?? detectedTimezone(),
    present_company: profile?.present_company ?? "",
    current_job_title: profile?.current_job_title ?? "",
    years_of_experience: profile?.years_of_experience ?? "",
    skills: profile?.skills ?? "",
    preferred_roles: profile?.preferred_roles ?? "",
    current_ctc: profile?.current_ctc ?? "",
    expected_ctc: profile?.expected_ctc ?? "",
    currency: profile?.currency ?? "INR",
    notice_period_days: profile?.notice_period_days ?? "",
    portfolio_url: profile?.portfolio_url ?? "",
    linkedin_url: profile?.linkedin_url ?? "",
  };
}

const MAX_CTC = 9_999_999_999;

function validateProfile(values) {
  const errors = {};

  if (values.display_name.trim().length < 2) {
    errors.display_name = "Enter at least 2 characters.";
  }

  if (values.phone && !/^\+?[0-9()\-\s]{7,30}$/.test(values.phone.trim())) {
    errors.phone = "Enter a valid phone number using digits and an optional country code.";
  }

  if (!values.timezone.trim()) {
    errors.timezone = "Timezone is required.";
  } else {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: values.timezone }).format();
    } catch {
      errors.timezone = "Enter a valid timezone, such as Asia/Calcutta.";
    }
  }

  if (!values.preferred_roles.trim()) {
    errors.preferred_roles = "Add at least one preferred role.";
  }

  const numberRules = [
    ["years_of_experience", "Years of experience", 0, 80],
    ["current_ctc", "Current CTC", 0, MAX_CTC],
    ["expected_ctc", "Expected CTC", 0, MAX_CTC],
    ["notice_period_days", "Notice period", 0, 730],
  ];

  numberRules.forEach(([name, label, minimum, maximum]) => {
    if (values[name] === "") return;

    const number = Number(values[name]);

    if (!Number.isFinite(number) || number < minimum || number > maximum) {
      errors[name] = `${label} must be between ${minimum.toLocaleString()} and ${maximum.toLocaleString()}.`;
    }
  });

  ["portfolio_url", "linkedin_url"].forEach((name) => {
    if (!values[name]) return;

    try {
      const url = new URL(values[name]);
      if (!["http:", "https:"].includes(url.protocol)) throw new Error();
    } catch {
      errors[name] = "Enter a complete web address beginning with http:// or https://.";
    }
  });

  return errors;
}

function Field({ children, error, hint, label, required = false, wide = false }) {
  const input = cloneElement(children, {
    "aria-describedby": error ? `${children.props.name}-error` : undefined,
    "aria-invalid": Boolean(error),
  });

  return (
    <label className={`profile-field${wide ? " profile-field--wide" : ""}`}>
      <span>{label}{required && <b aria-hidden="true"> *</b>}</span>
      {input}
      {error ? (
        <small className="profile-field__error" id={`${children.props.name}-error`}>
          {error}
        </small>
      ) : hint ? <small>{hint}</small> : null}
    </label>
  );
}

function ProfileForm({ error, identity, isSaving, mode = "profile", onCancel, onErrorDismiss, onSave, profile }) {
  const [values, setValues] = useState(() => initialValues(profile, identity));
  const [fieldErrors, setFieldErrors] = useState({});
  const [failedAvatar, setFailedAvatar] = useState(null);
  const email = profile?.email ?? identity?.email ?? "";
  const avatar = profile?.avatar_url ?? googleAvatar(identity);

  function handleChange(event) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: undefined }));
    onErrorDismiss?.();
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const formElement = event.currentTarget;
    const nextErrors = validateProfile(values);
    setFieldErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      window.requestAnimationFrame(() => {
        formElement.querySelector('[aria-invalid="true"]')?.focus();
      });
      return;
    }

    await onSave(values);
  }

  const form = (
    <form className="profile-form" noValidate onSubmit={handleSubmit}>
      <section className="profile-section">
        <div className="profile-section__heading">
          <div>
            <h2>Identity</h2>
            <p>Google verifies your email and profile photo.</p>
          </div>
        </div>

        <div className="profile-identity">
          <div className="profile-avatar" aria-hidden="true">
            {avatar && avatar !== failedAvatar ? (
              <img src={avatar} alt="" onError={() => setFailedAvatar(avatar)} />
            ) : (
              <UserCircle size={34} weight="duotone" />
            )}
          </div>
          <div>
            <strong>{email}</strong>
            <span><CheckCircle size={15} weight="fill" /> Verified Google account</span>
          </div>
        </div>

        <div className="profile-grid">
          <Field error={fieldErrors.display_name} label="Display name" required>
            <input name="display_name" value={values.display_name} onChange={handleChange} maxLength="100" required />
          </Field>
          <Field error={fieldErrors.phone} label="Phone">
            <input name="phone" type="tel" value={values.phone} onChange={handleChange} maxLength="30" placeholder="Your preferred contact number" />
          </Field>
          <Field label="Location">
            <input name="location" value={values.location} onChange={handleChange} maxLength="150" placeholder="Bengaluru, India" />
          </Field>
        </div>
      </section>

      <section className="profile-section">
        <div className="profile-section__heading">
          <div>
            <h2>Professional direction</h2>
            <p>Used to organize applications and extension captures.</p>
          </div>
        </div>

        <div className="profile-grid">
          <Field label="Present company">
            <input name="present_company" value={values.present_company} onChange={handleChange} maxLength="150" placeholder="Current employer" />
          </Field>
          <Field label="Current job title">
            <input name="current_job_title" value={values.current_job_title} onChange={handleChange} maxLength="150" placeholder="Software Engineer" />
          </Field>
          <Field error={fieldErrors.years_of_experience} label="Years of experience">
            <input name="years_of_experience" type="number" min="0" max="80" step="0.5" value={values.years_of_experience} onChange={handleChange} placeholder="4.5" />
          </Field>
          <Field error={fieldErrors.preferred_roles} label="Preferred roles" required>
            <input name="preferred_roles" value={values.preferred_roles} onChange={handleChange} maxLength="500" placeholder="Full Stack Developer, Software Engineer" required />
          </Field>
          <Field label="Skills" hint="Separate skills with commas" wide>
            <textarea name="skills" value={values.skills} onChange={handleChange} maxLength="2000" rows="4" placeholder="React, Node.js, MySQL, Cloudflare" />
          </Field>
        </div>
      </section>

      <section className="profile-section">
        <div className="profile-section__heading">
          <div>
            <h2>Compensation and availability</h2>
            <p>Private details used when you compare opportunities.</p>
          </div>
        </div>

        <div className="profile-grid profile-grid--three">
          <Field error={fieldErrors.current_ctc} label="Current CTC">
            <input name="current_ctc" type="number" min="0" max={MAX_CTC} step="0.01" value={values.current_ctc} onChange={handleChange} />
          </Field>
          <Field error={fieldErrors.expected_ctc} label="Expected CTC">
            <input name="expected_ctc" type="number" min="0" max={MAX_CTC} step="0.01" value={values.expected_ctc} onChange={handleChange} />
          </Field>
          <Field label="Currency">
            <select name="currency" value={values.currency} onChange={handleChange}>
              <option value="INR">INR</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </select>
          </Field>
          <Field error={fieldErrors.notice_period_days} label="Notice period in days">
            <input name="notice_period_days" type="number" min="0" max="730" value={values.notice_period_days} onChange={handleChange} placeholder="30" />
          </Field>
          <Field error={fieldErrors.portfolio_url} label="Portfolio URL">
            <input name="portfolio_url" type="url" value={values.portfolio_url} onChange={handleChange} maxLength="2048" placeholder="https://your-work.example" />
          </Field>
          <Field error={fieldErrors.linkedin_url} label="LinkedIn URL">
            <input name="linkedin_url" type="url" value={values.linkedin_url} onChange={handleChange} maxLength="2048" placeholder="https://linkedin.com/in/…" />
          </Field>
        </div>
      </section>

      {error && <p className="inline-error profile-save-error" role="alert">{error}</p>}

      <div className="profile-actions">
        {onCancel && <button type="button" className="button-secondary" onClick={onCancel}>Cancel</button>}
        <button type="submit" className="button-primary" disabled={isSaving}>
          {isSaving ? "Saving changes…" : mode === "onboarding" ? "Finish setup" : "Save changes"}
          {!isSaving && <ArrowRight size={18} weight="bold" aria-hidden="true" />}
        </button>
      </div>
    </form>
  );

  if (mode === "profile") return form;

  return (
    <main className="onboarding-page">
      <aside className="onboarding-aside">
        <div className="brand-mark"><span className="brand-mark__icon">C</span><span>Concourse</span></div>
        <div>
          <h1>Set up your profile</h1>
          <p>Add the details Concourse uses to organize applications and outreach.</p>
        </div>
        <ol className="onboarding-progress">
          <li className="is-complete"><span>1</span>Google account</li>
          <li className="is-active"><span>2</span>Career profile</li>
        </ol>
      </aside>
      <div className="onboarding-content">
        <header>
          <p className="onboarding-kicker">Career profile</p>
          <h2>Your job search details</h2>
          <p>Required fields are marked with an asterisk. You can update everything later.</p>
        </header>
        {form}
      </div>
    </main>
  );
}

export default ProfileForm;
