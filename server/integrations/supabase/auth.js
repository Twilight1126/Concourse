export async function getSupabaseUser(env, accessToken) {
  if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY) {
    const error = new Error("Supabase authentication is not configured.");
    error.status = 500;
    error.code = "SUPABASE_NOT_CONFIGURED";
    throw error;
  }

  const response = await fetch(`${env.SUPABASE_URL.replace(/\/$/, "")}/auth/v1/user`, {
    headers: {
      apikey: env.SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = new Error("Your session is invalid or expired.");
    error.status = 401;
    error.code = "INVALID_SESSION";
    throw error;
  }

  const user = await response.json();

  return {
    id: user.id,
    email: user.email,
    emailVerified: Boolean(user.email_confirmed_at),
    displayName: user.user_metadata?.full_name ?? user.user_metadata?.name ?? "",
    avatarUrl: user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? null,
  };
}
