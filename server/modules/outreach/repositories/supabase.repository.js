const COLUMNS = [
  "id", "contact_name", "contact_title", "company_name", "contact_email",
  "sender_email", "subject", "resume_filename", "linkedin_url", "source",
  "contact_source", "outreach_type", "related_application_id", "status",
  "sent_at", "follow_up_at", "notes", "created_at", "updated_at",
].join(",");

export function createSupabaseOutreachRepository(env, accessToken) {
  const baseUrl = env.SUPABASE_URL?.replace(/\/$/, "");
  if (!baseUrl || !env.SUPABASE_PUBLISHABLE_KEY) {
    const error = new Error("Supabase is not configured.");
    error.status = 500;
    throw error;
  }

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
      const error = new Error(response.status === 401 ? "Your session is invalid or expired." : "The database request failed.");
      error.status = response.status;
      throw error;
    }
    return response.status === 204 ? null : response.json();
  }

  return {
    findAll: () => request(`outreach?select=${COLUMNS}&order=created_at.desc,id.desc`),
    async findById(id) {
      const rows = await request(`outreach?select=${COLUMNS}&id=eq.${id}&limit=1`);
      return rows[0] ?? null;
    },
    async insert(record) {
      const rows = await request(`outreach?select=${COLUMNS}`, {
        method: "POST", headers: { Prefer: "return=representation" }, body: record,
      });
      return rows[0];
    },
    async update(id, record) {
      const rows = await request(`outreach?id=eq.${id}&select=${COLUMNS}`, {
        method: "PATCH", headers: { Prefer: "return=representation" }, body: record,
      });
      return rows[0] ?? null;
    },
    async remove(id) {
      const rows = await request(`outreach?id=eq.${id}&select=id`, {
        method: "DELETE", headers: { Prefer: "return=representation" },
      });
      return rows.length > 0;
    },
  };
}
