const COLUMNS = [
  "id", "company_name", "job_title", "job_url", "source", "status",
  "applied_at", "notes", "created_at", "updated_at",
].join(",");

export function createSupabaseApplicationsRepository(env, accessToken) {
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
    findAll: () => request(`applications?select=${COLUMNS}&order=created_at.desc,id.desc`),

    async findById(id) {
      const rows = await request(`applications?select=${COLUMNS}&id=eq.${id}&limit=1`);
      return rows[0] ?? null;
    },

    async insert(application) {
      const rows = await request(`applications?select=${COLUMNS}`, {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: application,
      });
      return rows[0];
    },

    async update(id, application) {
      const rows = await request(`applications?id=eq.${id}&select=${COLUMNS}`, {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: application,
      });
      return rows[0] ?? null;
    },

    async remove(id) {
      const rows = await request(`applications?id=eq.${id}&select=id`, {
        method: "DELETE",
        headers: { Prefer: "return=representation" },
      });
      return rows.length > 0;
    },
  };
}
