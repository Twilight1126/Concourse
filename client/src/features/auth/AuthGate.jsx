import { useEffect, useState } from "react";
import { GoogleLogo, ShieldCheck } from "@phosphor-icons/react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import {
  isSupabaseConfigured,
  supabase,
} from "../../lib/supabase";
import { AuthContext } from "./auth-context";
import { invalidateRequestCache } from "../../api/client";
import LoadingSkeleton from "../../components/LoadingSkeleton";
import BrandMark from "../../components/BrandMark";
import { ThemeToggle } from "../../components/Theme";
import "./AuthGate.css";

function AuthPage({ error, onSignIn }) {
  return (
    <main className="auth-page">
      <section className="auth-story" aria-labelledby="auth-heading">
        <BrandMark className="brand-mark" />

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
        <ThemeToggle className="auth-theme-toggle" />
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

  useEffect(() => {
    if (!supabase) return undefined;

    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === "SIGNED_OUT") invalidateRequestCache();

      setSession(nextSession);
      if (event === "SIGNED_IN") setError(null);
      setIsLoading(false);
    });

    return () => data.subscription.unsubscribe();
  }, []);

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

    navigate("/", { replace: true });
  }

  if (!isSupabaseConfigured) {
    return <p className="page-status" role="alert">Authentication is not configured.</p>;
  }

  if (isLoading) {
    return <LoadingSkeleton type="auth" label="Checking your session" />;
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
