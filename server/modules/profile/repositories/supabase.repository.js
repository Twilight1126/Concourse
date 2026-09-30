const COLUMNS = [
  "display_name",
  "avatar_url",
  "email",
  "phone",
  "location",
  "timezone",
  "present_company",
  "current_job_title",
  "years_of_experience",
  "skills",
  "preferred_roles",
  "current_ctc",
  "expected_ctc",
  "currency",
  "notice_period_days",
  "portfolio_url",
  "linkedin_url",
  "created_at",
  "updated_at",
].join(",");

export function createSupabaseProfileRepository(env, accessToken) {
  if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY) {
    const error = new Error("Supabase is not configured.");
    error.status = 500;
    error.code = "SUPABASE_NOT_CONFIGURED";
    throw error;
  }

  const baseUrl = env.SUPABASE_URL.replace(/\/$/, "");

  async function request(path, options = {}) {
    const response = await fetch(`${baseUrl}/rest/v1/${path}`, {
      method: options.method ?? "GET",
      headers: {
        apikey: env.SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      const error = new Error(
        response.status === 401
          ? "Your session is invalid or expired."
          : "The database request failed.",
      );
      error.status = response.status;
      error.code = response.status === 401 ? "INVALID_SESSION" : "DATABASE_ERROR";
      throw error;
    }

    return response.status === 204 ? null : response.json();
  }

  return {
    async find() {
      const rows = await request(`profiles?select=${COLUMNS}&limit=1`);

      return rows[0] ?? null;
    },

    async upsert(profile) {
      const current = await this.find();

      if (current) {
        const rows = await request(`profiles?select=${COLUMNS}`, {
          method: "PATCH",
          headers: { Prefer: "return=representation" },
          body: profile,
        });

        return rows[0];
      }

      const rows = await request(`profiles?select=${COLUMNS}`, {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: profile,
      });

      return rows[0];
    },
  };
}
