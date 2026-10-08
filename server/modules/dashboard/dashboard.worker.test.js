import assert from "node:assert/strict";
import { test } from "node:test";
import { handleDashboardRequest } from "./dashboard.worker.js";

test("dashboard requires a signed-in account", async () => {
  const response = await handleDashboardRequest(new Request("https://example.com/api/dashboard"), {});
  assert.equal(response.status, 401);
});

test("dashboard uses the caller's token for its aggregate query", async () => {
  const originalFetch = globalThis.fetch;
  let request;
  globalThis.fetch = async (url, options) => {
    request = { url, options };
    return Response.json({ stage_counts: [], sources: [], application_activity: [], recent: [] });
  };
  try {
    const response = await handleDashboardRequest(
      new Request("https://example.com/api/dashboard", { headers: { Authorization: "Bearer member-token" } }),
      { SUPABASE_URL: "https://test.supabase.co", SUPABASE_PUBLISHABLE_KEY: "public-key" },
    );
    assert.equal(response.status, 200);
    assert.equal(request.url, "https://test.supabase.co/rest/v1/rpc/user_application_dashboard_stats");
    assert.equal(request.options.headers.Authorization, "Bearer member-token");
  } finally { globalThis.fetch = originalFetch; }
});
