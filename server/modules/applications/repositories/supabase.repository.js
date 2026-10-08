const COLUMNS = [
  "id", "company_name", "job_title", "job_url", "source", "location",
  "work_mode", "employment_type", "experience_min", "experience_max",
  "salary_min", "salary_max", "salary_currency", "salary_period",
  "expected_salary", "experience_required", "salary_budget", "resume_filename",
  "interview_stage", "interview_at", "rejection_reason",
  "status", "applied_at", "next_action", "follow_up_at",
  "notes", "created_at", "updated_at",
].join(",");
const UPDATE_COLUMNS = "id,application_id,status,title,happened_at,details,created_at,updated_at";

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
    findAll: () => request(`applications?select=${COLUMNS}&order=updated_at.desc,id.desc`),

    findPage: ({ page, search, status, source }) => request("rpc/applications_page", {
      method: "POST",
      body: { page_number: page, search_text: search, status_filter: status, source_filter: source },
    }),

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

    findUpdates: (applicationId) => request(`application_updates?select=${UPDATE_COLUMNS}&application_id=eq.${applicationId}&order=happened_at.desc,id.desc`),

    async findUpdate(applicationId, updateId) {
      const rows = await request(`application_updates?select=${UPDATE_COLUMNS}&application_id=eq.${applicationId}&id=eq.${updateId}&limit=1`);
      return rows[0] ?? null;
    },

    async insertUpdate(update) {
      const rows = await request(`application_updates?select=${UPDATE_COLUMNS}`, {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: update,
      });
      return rows[0];
    },

    async updateUpdate(applicationId, updateId, changes) {
      const rows = await request(`application_updates?application_id=eq.${applicationId}&id=eq.${updateId}&select=${UPDATE_COLUMNS}`, {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: changes,
      });
      return rows[0] ?? null;
    },

    async removeUpdate(applicationId, updateId) {
      const rows = await request(`application_updates?application_id=eq.${applicationId}&id=eq.${updateId}&select=id`, {
        method: "DELETE",
        headers: { Prefer: "return=representation" },
      });
      return rows.length > 0;
    },
  };
}
