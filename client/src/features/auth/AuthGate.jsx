import { useEffect, useRef, useState } from "react";
import { GoogleLogo, ShieldCheck } from "@phosphor-icons/react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import {
  isSupabaseAuthEnabled,
  isSupabaseConfigured,
  supabase,
} from "../../lib/supabase";
import { AuthContext } from "./auth-context";
import "./AuthGate.css";

const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const ACTIVITY_STORAGE_KEY = "concourse:last-activity";
const ACTIVITY_EVENTS = ["pointerdown", "keydown", "scroll", "touchstart"];

function AuthPage({ error, onSignIn }) {
  return (
    <main className="auth-page">
      <section className="auth-story" aria-labelledby="auth-heading">
        <div className="brand-mark" aria-label="Concourse">
          <span className="brand-mark__icon">C</span>
          <span>Concourse</span>
        </div>

        <div className="auth-story__content">
          <p className="auth-kicker">Your job search workspace</p>
          <h1 id="auth-heading">Run your job search in one place</h1>
          <p>
            Track applications, manage outreach, and keep every follow-up clear.
          </p>
        </div>

        <div className="auth-proof">
          <ShieldCheck size={20} weight="duotone" aria-hidden="true" />
          <span>Your records stay private to your account.</span>
        </div>
      </section>

      <section className="auth-action" aria-label="Sign in or create an account">
        <div className="auth-action__content">
          <h2>Sign in to Concourse</h2>
          <p>
            Continue with Google to sign in. Your account is created
            automatically the first time you continue.
          </p>

          <button className="google-button" type="button" onClick={onSignIn}>
            <GoogleLogo size={21} weight="bold" aria-hidden="true" />
            Continue with Google
          </button>

          {error && <p className="form-error" role="alert">{error}</p>}

          <p className="auth-action__terms">
            Concourse requests only your verified identity during sign-in.
          </p>
        </div>
      </section>
    </main>
  );
}

function AuthGate({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState(null);
  const lastRecordedActivity = useRef(0);

  useEffect(() => {
    if (!supabase) return undefined;

    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      setSession(data.session);
      setError(sessionError?.message ?? null);
      setIsLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setIsLoading(false);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session || !supabase) return undefined;

    function recordActivity() {
      const now = Date.now();

      // Limit storage writes while still treating any interaction as activity.
      if (now - lastRecordedActivity.current < 30_000) return;

      lastRecordedActivity.current = now;
      window.localStorage.setItem(ACTIVITY_STORAGE_KEY, String(now));
    }

    async function checkIdleTime() {
      const lastActivity = Number(
        window.localStorage.getItem(ACTIVITY_STORAGE_KEY),
      );

      if (lastActivity && Date.now() - lastActivity >= IDLE_TIMEOUT_MS) {
        await supabase.auth.signOut({ scope: "local" });
        setError("You were signed out after 30 minutes of inactivity.");
        navigate("/", { replace: true });
      }
    }

    const storedActivity = Number(
      window.localStorage.getItem(ACTIVITY_STORAGE_KEY),
    );

    if (storedActivity && Date.now() - storedActivity >= IDLE_TIMEOUT_MS) {
      void checkIdleTime();
    } else if (!storedActivity) {
      recordActivity();
    }

    ACTIVITY_EVENTS.forEach((eventName) =>
      window.addEventListener(eventName, recordActivity, { passive: true }),
    );
    window.addEventListener("focus", checkIdleTime);
    window.addEventListener("storage", checkIdleTime);
    document.addEventListener("visibilitychange", checkIdleTime);
    const intervalId = window.setInterval(checkIdleTime, 60_000);

    return () => {
      ACTIVITY_EVENTS.forEach((eventName) =>
        window.removeEventListener(eventName, recordActivity),
      );
      window.removeEventListener("focus", checkIdleTime);
      window.removeEventListener("storage", checkIdleTime);
      document.removeEventListener("visibilitychange", checkIdleTime);
      window.clearInterval(intervalId);
    };
  }, [navigate, session]);

  async function signIn() {
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });

    if (signInError) setError(signInError.message);
  }

  async function signOut() {
    setError(null);

    const { error: signOutError } = await supabase.auth.signOut({
      scope: "local",
    });

    if (signOutError) {
      setError(signOutError.message);
      return;
    }

    window.localStorage.removeItem(ACTIVITY_STORAGE_KEY);
    navigate("/", { replace: true });
  }

  if (!isSupabaseAuthEnabled) {
    return (
      <AuthContext.Provider value={{ session: null, signOut }}>
        {children}
      </AuthContext.Provider>
    );
  }

  if (!isSupabaseConfigured) {
    return <p className="page-status" role="alert">Authentication is not configured.</p>;
  }

  if (isLoading) {
    return (
      <main className="auth-loading" aria-label="Checking your session">
        <div className="auth-loading__brand" />
        <div className="auth-loading__line" />
        <div className="auth-loading__button" />
      </main>
    );
  }

  if (!session && location.pathname !== "/") {
    return <Navigate to="/" replace />;
  }

  if (!session) return <AuthPage error={error} onSignIn={signIn} />;

  return (
    <AuthContext.Provider value={{ session, signOut }}>
      {children}
      {error && <p className="form-error auth-session-error" role="alert">{error}</p>}
    </AuthContext.Provider>
  );
}

export default AuthGate;
