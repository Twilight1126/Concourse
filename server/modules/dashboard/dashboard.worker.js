import { getAccessToken, workerErrorResponse } from "../../http/worker.js";

export async function handleDashboardRequest(request, env) {
  const token = getAccessToken(request);
  if (!token) return Response.json({ error: { code: "AUTH_REQUIRED", message: "Sign in is required." } }, { status: 401 });
  try {
    const upstream = await fetch(`${env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/rpc/user_application_dashboard_stats`, {
      method: "POST",
      headers: {
        apikey: env.SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: "{}",
    });
    if (!upstream.ok) {
      const error = new Error(upstream.status === 401 ? "Your session is invalid or expired." : "Dashboard data is unavailable.");
      error.status = upstream.status;
      throw error;
    }
    return Response.json({ data: await upstream.json() });
  } catch (error) { return workerErrorResponse(error); }
}
