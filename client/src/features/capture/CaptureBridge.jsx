import { useEffect } from "react";
import {
  authMode,
  supabaseKey,
  supabaseUrl,
} from "../../lib/supabase";
import { useAuth } from "../auth/auth-context";

const EXTENSION_SOURCE = "concourse-extension";
const WEB_SOURCE = "concourse-web";

export default function CaptureBridge() {
  const { session } = useAuth();
  const isAuthenticated = Boolean(session);
  const apiUrl = new URL(
    import.meta.env.VITE_API_URL || "/api",
    window.location.origin,
  ).href.replace(/\/$/, "");

  useEffect(() => {
    function respond(message) {
      window.postMessage({ source: WEB_SOURCE, ...message });
    }

    async function receive(event) {
      if (event.source !== window || event.data?.source !== EXTENSION_SOURCE) return;

      if (event.data.type === "CONCOURSE_EXTENSION_CONNECTION") {
        respond({
          type: "CONCOURSE_EXTENSION_CONNECTION_RESULT",
          requestId: event.data.requestId,
          ok: isAuthenticated,
          authenticated: isAuthenticated,
          connection: isAuthenticated ? {
            workspaceUrl: window.location.origin,
            apiUrl,
            authMode,
            userId: session?.user?.id ?? null,
            userEmail: session?.user?.email ?? null,
            accessToken: window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
              ? session?.access_token ?? null
              : null,
            supabaseUrl,
            supabaseKey,
          } : null,
          error: isAuthenticated ? null : "Sign in to Concourse before connecting the extension.",
        });
        return;
      }

    }

    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [apiUrl, isAuthenticated, session]);

  return null;
}
