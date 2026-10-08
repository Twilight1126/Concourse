import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { getProfile, saveProfile } from "../../api/profile";
import LoadingSkeleton from "../../components/LoadingSkeleton";
import { useAuth } from "../auth/auth-context";
import ProfileForm from "./components/ProfileForm";
import { useActionFeedback } from "../../components/action-feedback-context";
import { ProfileContext } from "./profile-context";

function ProfileGate({ children }) {
  const { notify } = useActionFeedback();
  const { session } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [retryVersion, setRetryVersion] = useState(0);

  useEffect(() => {
    let active = true;
    async function loadProfile() {
      try {
        setLoadError(null);
        const nextProfile = await getProfile();
        if (active) setProfile(nextProfile);
      } catch (loadError) {
        if (active) setLoadError(loadError.message);
      } finally {
        if (active) setHasLoaded(true);
      }
    }

    void loadProfile();
    return () => { active = false; };
  }, [session?.user?.id, retryVersion]);

  async function handleSave(values) {
    setIsSaving(true);
    setSaveError(null);

    try {
      const savedProfile = await saveProfile(values);
      setProfile(savedProfile);

      if (import.meta.env.DEV) console.info("Concourse profile saved.");

      return savedProfile;
    } catch (saveError) {
      setSaveError(saveError.message);
      return null;
    } finally {
      setIsSaving(false);
    }
  }

  if (!hasLoaded) {
    return <LoadingSkeleton type="profile" label="Loading your workspace" />;
  }

  if (loadError) {
    return <main className="page-status" role="alert">{loadError} <button type="button" onClick={() => { setHasLoaded(false); setLoadError(null); setRetryVersion((version) => version + 1); }}>Try again</button></main>;
  }

  if (!profile && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }

  if (!profile) {
    return (
      <ProfileForm
        identity={session?.user}
        error={saveError}
        isSaving={isSaving}
        mode="onboarding"
        onErrorDismiss={() => setSaveError(null)}
        onSave={async (values) => {
          const saved = await handleSave(values);
          if (saved) { notify("Profile ready"); navigate("/dashboard", { replace: true }); }
          else notify("Could not save profile. Please try again.", "error");
          return saved;
        }}
      />
    );
  }

  if (location.pathname === "/onboarding") {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <ProfileContext.Provider value={{ profile, error: saveError, isSaving, save: handleSave, clearError: () => setSaveError(null) }}>
      {children}
    </ProfileContext.Provider>
  );
}

export default ProfileGate;
