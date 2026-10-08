import { createClient } from "@supabase/supabase-js";

const clients = new Map();

function authClient(env) {
  const url = env.SUPABASE_URL?.replace(/\/$/, "");
  const key = env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    const error = new Error("Supabase authentication is not configured.");
    error.status = 500;
    error.code = "SUPABASE_NOT_CONFIGURED";
    throw error;
  }

  const cacheKey = `${url}:${key}`;
  if (!clients.has(cacheKey)) {
    clients.set(cacheKey, createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    }));
  }
  return { client: clients.get(cacheKey), issuer: `${url}/auth/v1` };
}

export async function getSupabaseUser(env, accessToken) {
  const { client, issuer } = authClient(env);
  let claims;
  let failure;
  try {
    const result = await client.auth.getClaims(accessToken);
    claims = result.data?.claims;
    failure = result.error;
  } catch (error) {
    failure = error;
  }

  if (failure || !claims) {
    const unavailable = !failure?.status || failure.status >= 500;
    const error = new Error(unavailable ? "Could not reach the sign-in service. Please try again." : "Your session is invalid or expired.");
    error.status = unavailable ? 503 : 401;
    error.code = unavailable ? "AUTH_UNAVAILABLE" : "INVALID_SESSION";
    throw error;
  }

  if (claims.iss !== issuer || claims.aud !== "authenticated" || claims.role !== "authenticated" || !claims.sub || typeof claims.email !== "string") {
    const error = new Error("Your session is invalid or expired.");
    error.status = 401;
    error.code = "INVALID_SESSION";
    throw error;
  }

  return {
    id: claims.sub,
    email: claims.email,
    displayName: claims.user_metadata?.full_name ?? claims.user_metadata?.name ?? "",
    avatarUrl: claims.user_metadata?.avatar_url ?? claims.user_metadata?.picture ?? null,
  };
}

// Profile writes need the current confirmation state, which is not in the access token.
export async function getCurrentSupabaseUser(env, accessToken) {
  const identity = await getSupabaseUser(env, accessToken);
  const { client } = authClient(env);
  let user;
  let failure;
  try {
    const result = await client.auth.getUser(accessToken);
    user = result.data?.user;
    failure = result.error;
  } catch (error) {
    failure = error;
  }
  if (failure || !user) {
    const unavailable = !failure?.status || failure.status >= 500;
    const error = new Error(unavailable ? "Could not reach the sign-in service. Please try again." : "Your session is invalid or expired.");
    error.status = unavailable ? 503 : 401;
    error.code = unavailable ? "AUTH_UNAVAILABLE" : "INVALID_SESSION";
    throw error;
  }
  if (user.id !== identity.id) {
    const error = new Error("Your session is invalid or expired.");
    error.status = 401;
    error.code = "INVALID_SESSION";
    throw error;
  }
  return { ...identity, email: user.email, emailVerified: Boolean(user.email_confirmed_at) };
}
