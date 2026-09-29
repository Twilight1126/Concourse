import { useEffect, useState } from "react";
import {
  isSupabaseAuthEnabled,
  isSupabaseConfigured,
  supabase,
} from "../../lib/supabase";
import "./AuthGate.css";

function AuthGate({ children }) {
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState(null);

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
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) setError(signOutError.message);
  }

  if (!isSupabaseAuthEnabled) return children;

  if (!isSupabaseConfigured) {
    return <p role="alert">Supabase environment variables are not configured.</p>;
  }

  if (isLoading) return <p role="status">Checking your session…</p>;

  if (!session) {
    return (
      <main className="auth-shell">
        <p className="eyebrow">Concourse</p>
        <h1>Track every opportunity.</h1>
        <p>Sign in to access your applications.</p>
        <button type="button" onClick={signIn}>Continue with Google</button>
        {error && <p role="alert">{error}</p>}
      </main>
    );
  }

  return (
    <>
      <div className="session-bar">
        <span>{session.user.email}</span>
        <button type="button" onClick={signOut}>Sign out</button>
      </div>
      {children}
      {error && <p role="alert">{error}</p>}
    </>
  );
}

export default AuthGate;
