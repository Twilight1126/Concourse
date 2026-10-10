import assert from "node:assert/strict";
import test from "node:test";
import { handleAdminRequest } from "./admin.worker.js";
import { jwksResponse, signedToken } from "../../fixtures/supabase-auth.js";

const env = { SUPABASE_URL: "https://example.supabase.co", SUPABASE_PUBLISHABLE_KEY: "public-key" };

test("admin API requires a signed-in user", async () => {
  const request = new Request("https://concourse.test/api/admin/summary");
  const response = await handleAdminRequest(request, env, "/api/admin/summary");
  assert.equal(response.status, 401);
});

test("admin summary denies a signed-in user without membership", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => jwksResponse(url) || Response.json({ code: "42501" }, { status: 403 });
  try {
    const request = new Request("https://concourse.test/api/admin/summary", { headers: { Authorization: `Bearer ${signedToken(env.SUPABASE_URL, "user-id")}` } });
    const response = await handleAdminRequest(request, env, "/api/admin/summary");
    assert.equal(response.status, 403);
    assert.equal((await response.json()).error.code, "FORBIDDEN");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("admin summary uses the signed-in user's token for its RPC", async () => {
  const originalFetch = globalThis.fetch;
  let rpcToken = "";
  globalThis.fetch = async (url, options) => {
    const keys = jwksResponse(url);
    if (keys) return keys;
    rpcToken = options.headers.Authorization;
    return Response.json({ members: 2, applications: 5, stages: { applied: 3 } });
  };
  try {
    const token = signedToken(env.SUPABASE_URL, "admin-id");
    const request = new Request("https://concourse.test/api/admin/summary", { headers: { Authorization: `Bearer ${token}` } });
    const response = await handleAdminRequest(request, env, "/api/admin/summary");
    assert.equal(response.status, 200);
    assert.equal(rpcToken, `Bearer ${token}`);
    assert.equal((await response.json()).data.applications, 5);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("admin summary reads production API metrics with Analytics SQL aggregates", async () => {
  const originalFetch = globalThis.fetch;
  let query;
  globalThis.fetch = async (url) => jwksResponse(url) || Response.json({ members: 1, applications: 1 });
  try {
    const currentMinute = Math.floor(Date.now() / 60000) * 60;
    const analyticsEnv = {
      ...env,
      ANALYTICS_SQL: {
        async query(request) {
          query = request.query;
          return { data: [{ minute: currentMinute, requests: 4, errors: 1, average_ms: 250 }] };
        },
      },
    };
    const request = new Request("https://concourse.test/api/admin/summary", {
      headers: { Authorization: `Bearer ${signedToken(env.SUPABASE_URL, "admin-id")}` },
    });
    const response = await handleAdminRequest(request, analyticsEnv, "/api/admin/summary");
    const { operations } = (await response.json()).data;
    assert.equal(operations.api.status, "active");
    assert.equal(operations.api.requests, 4);
    assert.equal(operations.api.errors, 1);
    assert.equal(operations.api.average_ms, 250);
    assert.match(query, /COUNT\(\).*countIf\(.*AVG\(double2\)/s);
    assert.doesNotMatch(query, /_sample_interval/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("admin users denies a signed-in user without membership", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => jwksResponse(url) || Response.json({ code: "42501" }, { status: 403 });
  try {
    const request = new Request("https://concourse.test/api/admin/users", { headers: { Authorization: `Bearer ${signedToken(env.SUPABASE_URL, "user-id")}` } });
    const response = await handleAdminRequest(request, env, "/api/admin/users");
    assert.equal(response.status, 403);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("admin users forwards search and pagination with the user's token", async () => {
  const originalFetch = globalThis.fetch;
  let rpcBody;
  let rpcToken;
  globalThis.fetch = async (url, options) => {
    const keys = jwksResponse(url);
    if (keys) return keys;
    rpcBody = JSON.parse(options.body);
    rpcToken = options.headers.Authorization;
    return Response.json({ users: [{ user_id: "one", display_name: "A" }], total: 1, page: 2, page_size: 10 });
  };
  try {
    const token = signedToken(env.SUPABASE_URL, "admin-id");
    const request = new Request("https://concourse.test/api/admin/users?page=2&search=A", { headers: { Authorization: `Bearer ${token}` } });
    const response = await handleAdminRequest(request, env, "/api/admin/users");
    assert.equal(response.status, 200);
    assert.deepEqual(rpcBody, { page_number: 2, search_text: "A" });
    assert.equal(rpcToken, `Bearer ${token}`);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
