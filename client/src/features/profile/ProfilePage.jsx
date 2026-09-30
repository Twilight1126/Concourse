import { CheckCircle, PencilSimple, UserCircle } from "@phosphor-icons/react";
import { useState } from "react";
import { useAuth } from "../auth/auth-context";
import { useProfile } from "./profile-context";
import ProfileForm from "./components/ProfileForm";

function ProfileValue({ label, link = false, value, wide = false }) {
  return (
    <div className={`profile-detail${wide ? " profile-detail--wide" : ""}`}>
      <dt>{label}</dt>
      <dd className={value ? undefined : "is-empty"}>
        {value && link ? <a href={value} rel="noreferrer" target="_blank">{value}</a> : value || "Not added"}
      </dd>
    </div>
  );
}

function formatCompensation(value, currency) {
  if (value === null || value === undefined || value === "") return null;

  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
    style: "currency",
    currency: currency || "INR",
  }).format(Number(value));
}

function ProfileOverview({ email, profile }) {
  const [failedAvatar, setFailedAvatar] = useState(null);
  const skills = profile.skills
    ?.split(",")
    .map((skill) => skill.trim())
    .filter(Boolean);

  return (
    <div className="profile-overview">
      <section className="profile-overview__identity" aria-labelledby="identity-heading">
        <div className="profile-overview__avatar">
          {profile.avatar_url && profile.avatar_url !== failedAvatar ? (
            <img src={profile.avatar_url} alt="" onError={() => setFailedAvatar(profile.avatar_url)} />
          ) : (
            <UserCircle size={42} weight="duotone" aria-hidden="true" />
          )}
        </div>
        <div>
          <h2 id="identity-heading">{profile.display_name}</h2>
          <p>{profile.current_job_title || profile.preferred_roles}</p>
          <span><CheckCircle size={16} weight="fill" aria-hidden="true" />{email}</span>
        </div>
      </section>

      <section className="profile-overview__section" aria-labelledby="contact-heading">
        <header><div><h2 id="contact-heading">Personal details</h2><p>Your identity and contact preferences.</p></div></header>
        <dl className="profile-details-grid">
          <ProfileValue label="Phone" value={profile.phone} />
          <ProfileValue label="Location" value={profile.location} />
        </dl>
      </section>

      <section className="profile-overview__section" aria-labelledby="professional-heading">
        <header><div><h2 id="professional-heading">Professional direction</h2><p>The context Concourse uses to organize opportunities.</p></div></header>
        <dl className="profile-details-grid">
          <ProfileValue label="Present company" value={profile.present_company} />
          <ProfileValue label="Current job title" value={profile.current_job_title} />
          <ProfileValue label="Years of experience" value={profile.years_of_experience != null ? `${profile.years_of_experience} years` : null} />
          <ProfileValue label="Preferred roles" value={profile.preferred_roles} />
          <div className="profile-detail profile-detail--wide">
            <dt>Skills</dt>
            <dd className="profile-skills">
              {skills?.length ? skills.map((skill) => <span key={skill}>{skill}</span>) : <span className="is-empty">Not added</span>}
            </dd>
          </div>
        </dl>
      </section>

      <section className="profile-overview__section" aria-labelledby="availability-heading">
        <header><div><h2 id="availability-heading">Compensation and availability</h2><p>Private details used when reviewing opportunities.</p></div></header>
        <dl className="profile-details-grid profile-details-grid--three">
          <ProfileValue label="Current CTC" value={formatCompensation(profile.current_ctc, profile.currency)} />
          <ProfileValue label="Expected CTC" value={formatCompensation(profile.expected_ctc, profile.currency)} />
          <ProfileValue label="Notice period" value={profile.notice_period_days != null ? `${profile.notice_period_days} days` : null} />
          <ProfileValue label="Portfolio" link value={profile.portfolio_url} wide />
          <ProfileValue label="LinkedIn" link value={profile.linkedin_url} wide />
        </dl>
      </section>
    </div>
  );
}

function ProfilePage() {
  const { session } = useAuth();
  const { profile, error, isSaving, save, clearError } = useProfile();
  const [isEditing, setIsEditing] = useState(false);
  const [notice, setNotice] = useState(null);

  function beginEditing() {
    clearError();
    setNotice(null);
    setIsEditing(true);
  }

  function cancelEditing() {
    clearError();
    setIsEditing(false);
  }

  async function saveChanges(values) {
    const savedProfile = await save(values);

    if (savedProfile) {
      setIsEditing(false);
      setNotice("Profile changes saved.");
    }

    return savedProfile;
  }

  return (
    <div className="app-shell profile-page">
      <header className="page-header">
        <div>
          <h1>{isEditing ? "Edit profile" : "Settings"}</h1>
          <p>{isEditing ? "Update the details Concourse uses across applications and outreach." : "Review the professional context Concourse uses across your workspace."}</p>
        </div>
        {!isEditing && (
          <button className="button-primary" type="button" onClick={beginEditing}>
            <PencilSimple size={18} weight="bold" aria-hidden="true" />
            Edit profile
          </button>
        )}
      </header>

      {notice && !isEditing && <p className="profile-notice" role="status"><CheckCircle size={18} weight="fill" aria-hidden="true" />{notice}</p>}

      {isEditing ? (
        <ProfileForm identity={session?.user} error={error} isSaving={isSaving} mode="profile" onCancel={cancelEditing} onErrorDismiss={clearError} onSave={saveChanges} profile={profile} />
      ) : (
        <ProfileOverview email={session?.user?.email} profile={profile} />
      )}
    </div>
  );
}

export default ProfilePage;
