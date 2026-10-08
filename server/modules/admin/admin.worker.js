import { getAccessToken, workerErrorResponse } from "../../http/worker.js";
import { getSupabaseUser } from "../../integrations/supabase/auth.js";

export async function handleAdminRequest(request, env, pathname) {
  if (request.method !== "GET" || !["/api/admin/access", "/api/admin/summary", "/api/admin/users"].includes(pathname)) {
    return Response.json({ error: { code: "NOT_FOUND", message: "API route not found." } }, { status: 404 });
  }
  const token = getAccessToken(request);
  if (!token) return Response.json({ error: { code: "AUTH_REQUIRED", message: "Sign in is required." } }, { status: 401 });

  try {
    await getSupabaseUser(env, token);
    const rpc = pathname.endsWith("/access") ? "admin_access" : pathname.endsWith("/users") ? "admin_users" : "admin_summary";
    const url = new URL(request.url);
    const page = Math.max(1, Math.min(100000, Number.parseInt(url.searchParams.get("page"), 10) || 1));
    const body = rpc === "admin_users" ? JSON.stringify({ page_number: page, search_text: (url.searchParams.get("search") || "").trim().slice(0, 100) }) : "{}";
    const response = await fetch(`${env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/rpc/${rpc}`, {
      method: "POST",
      headers: {
        apikey: env.SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body,
    });
    if (!response.ok) {
      const error = new Error(response.status === 403 ? "Admin access is required." : "Could not load admin data.");
      error.status = response.status === 403 ? 403 : 502;
      error.code = response.status === 403 ? "FORBIDDEN" : "ADMIN_DATA_UNAVAILABLE";
      throw error;
    }
    const data = await response.json();
    if (rpc === "admin_summary") data.operations = await getWorkerOperations(env);
    return Response.json({ data: rpc === "admin_access" ? { is_admin: data } : data }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return workerErrorResponse(error);
  }
}

async function getWorkerOperations(env) {
  const operations = {
    api: { status: "unavailable", requests: 0, errors: 0, average_ms: null, series: [] },
    database: { status: "connected", checked_at: new Date().toISOString() },
  };
  if (!env.ANALYTICS_SQL) return operations;
  try {
    const result = await env.ANALYTICS_SQL.query({
      query: `SELECT intDiv(toUInt32(timestamp), 60) * 60 AS minute,
        SUM(_sample_interval) AS requests,
        SUM(if(double1 >= 500, _sample_interval, 0)) AS errors,
        SUM(double2 * _sample_interval) / SUM(_sample_interval) AS average_ms
        FROM events.analyticsEngine."concourse_api_metrics"
        WHERE timestamp >= $start GROUP BY minute ORDER BY minute ASC LIMIT 60`,
      params: { start: new Date(Date.now() - 60 * 60000).toISOString() },
    });
    const byMinute = new Map((result.data || []).map((row) => [Number(row.minute) * 1000, row]));
    const firstMinute = Math.floor(Date.now() / 60000) * 60000 - 59 * 60000;
    const series = Array.from({ length: 60 }, (_, index) => {
      const minute = firstMinute + index * 60000;
      const row = byMinute.get(minute);
      return { minute: new Date(minute).toISOString(), requests: Number(row?.requests || 0), errors: Number(row?.errors || 0), average_ms: Number(row?.average_ms || 0) };
    });
    const requests = series.reduce((sum, row) => sum + row.requests, 0);
    operations.api = {
      status: "active", requests,
      errors: series.reduce((sum, row) => sum + row.errors, 0),
      average_ms: requests ? Math.round(series.reduce((sum, row) => sum + row.average_ms * row.requests, 0) / requests) : null,
      series,
    };
  } catch (error) {
    console.error("Admin analytics query failed", error);
  }
  return operations;
}
