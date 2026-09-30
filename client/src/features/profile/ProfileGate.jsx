import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { getProfile, saveProfile } from "../../api/profile";
import { useAuth } from "../auth/auth-context";
import ProfileForm from "./components/ProfileForm";
import { ProfileContext } from "./profile-context";
import "./ProfileGate.css";

function ProfileGate({ children }) {
  const { session } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        setLoadError(null);
        setProfile(await getProfile());
      } catch (loadError) {
        setLoadError(loadError.message);
      } finally {
        setHasLoaded(true);
      }
    }

    loadProfile();
  }, [session?.user?.id]);

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
    return (
      <main className="profile-loading" aria-label="Loading your workspace">
        <div />
        <div />
        <div />
      </main>
    );
  }

  if (loadError) {
    return <p className="page-status" role="alert">{loadError}</p>;
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
          if (saved) navigate("/dashboard", { replace: true });
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
