import assert from "node:assert/strict";
import { test } from "node:test";
import { requireCurrentIdentity, requireIdentity } from "./express-auth.js";
import { jwksResponse, signedToken } from "../fixtures/supabase-auth.js";

test("local routes reject requests without a bearer token", async () => {
  let error;
  await requireIdentity({ headers: {} }, null, (nextError) => { error = nextError; });
  assert.equal(error.code, "AUTH_REQUIRED");
  assert.equal(error.status, 401);
});

test("local identity comes from a verified Supabase token without a user lookup", async () => {
  const originalFetch = globalThis.fetch;
  const oldUrl = process.env.SUPABASE_URL;
  const oldKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  process.env.SUPABASE_URL = "https://dev.supabase.co";
  process.env.SUPABASE_PUBLISHABLE_KEY = "public-key";
  let keyRequests = 0;
  globalThis.fetch = async (url) => {
    keyRequests += 1;
    const response = jwksResponse(url);
    if (!response) throw new Error(`Unexpected Auth request: ${url}`);
    return response;
  };
  try {
    const token = signedToken(process.env.SUPABASE_URL);
    for (let index = 0; index < 2; index += 1) {
      const request = { headers: { authorization: `Bearer ${token}` } };
      let error;
      await requireIdentity(request, null, (nextError) => { error = nextError; });
      assert.equal(error, undefined);
      assert.equal(request.identity.id, "verified-account");
      if (index === 0) globalThis.fetch = async () => { throw new Error("Network unavailable"); };
    }
    assert.equal(keyRequests, 1);
  } finally {
    globalThis.fetch = originalFetch;
    if (oldUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = oldUrl;
    if (oldKey === undefined) delete process.env.SUPABASE_PUBLISHABLE_KEY;
    else process.env.SUPABASE_PUBLISHABLE_KEY = oldKey;
  }
});

test("local routes reject signed tokens for another project", async () => {
  const originalFetch = globalThis.fetch;
  const oldUrl = process.env.SUPABASE_URL;
  const oldKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  process.env.SUPABASE_URL = "https://other.supabase.co";
  process.env.SUPABASE_PUBLISHABLE_KEY = "public-key";
  globalThis.fetch = async (url) => jwksResponse(url);
  try {
    const token = signedToken("https://wrong.supabase.co");
    let error;
    await requireIdentity({ headers: { authorization: `Bearer ${token}` } }, null, (nextError) => { error = nextError; });
    assert.equal(error.code, "INVALID_SESSION");
    assert.equal(error.status, 401);
  } finally {
    globalThis.fetch = originalFetch;
    if (oldUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = oldUrl;
    if (oldKey === undefined) delete process.env.SUPABASE_PUBLISHABLE_KEY;
    else process.env.SUPABASE_PUBLISHABLE_KEY = oldKey;
  }
});

test("local routes reject malformed tokens without treating them as a network outage", async () => {
  const oldUrl = process.env.SUPABASE_URL;
  const oldKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  process.env.SUPABASE_URL = "https://dev.supabase.co";
  process.env.SUPABASE_PUBLISHABLE_KEY = "public-key";
  try {
    let error;
    await requireIdentity({ headers: { authorization: "Bearer malformed-token" } }, null, (nextError) => { error = nextError; });
    assert.equal(error.code, "INVALID_SESSION");
    assert.equal(error.status, 401);
  } finally {
    if (oldUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = oldUrl;
    if (oldKey === undefined) delete process.env.SUPABASE_PUBLISHABLE_KEY;
    else process.env.SUPABASE_PUBLISHABLE_KEY = oldKey;
  }
});

test("profile writes check current email confirmation with Supabase", async () => {
  const originalFetch = globalThis.fetch;
  const oldUrl = process.env.SUPABASE_URL;
  const oldKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  process.env.SUPABASE_URL = "https://profile.supabase.co";
  process.env.SUPABASE_PUBLISHABLE_KEY = "public-key";
  let userLookups = 0;
  globalThis.fetch = async (url) => {
    const keys = jwksResponse(url);
    if (keys) return keys;
    if (String(url).includes("/auth/v1/user")) {
      userLookups += 1;
      return Response.json({ id: "verified-account", email: "member@example.com", email_confirmed_at: "2026-01-01T00:00:00Z" });
    }
    throw new Error(`Unexpected Auth request: ${url}`);
  };
  try {
    const request = { headers: { authorization: `Bearer ${signedToken(process.env.SUPABASE_URL)}` } };
    let error;
    await requireCurrentIdentity(request, null, (nextError) => { error = nextError; });
    assert.equal(error, undefined);
    assert.equal(request.identity.emailVerified, true);
    assert.equal(userLookups, 1);
  } finally {
    globalThis.fetch = originalFetch;
    if (oldUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = oldUrl;
    if (oldKey === undefined) delete process.env.SUPABASE_PUBLISHABLE_KEY;
    else process.env.SUPABASE_PUBLISHABLE_KEY = oldKey;
  }
});

test("a cold-start key lookup outage reports unavailable without rejecting the session", async () => {
  const originalFetch = globalThis.fetch;
  const oldUrl = process.env.SUPABASE_URL;
  const oldKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  process.env.SUPABASE_URL = "https://offline.supabase.co";
  process.env.SUPABASE_PUBLISHABLE_KEY = "public-key";
  globalThis.fetch = async () => { throw new Error("Connection timed out"); };
  try {
    let error;
    const token = signedToken(process.env.SUPABASE_URL);
    await requireIdentity({ headers: { authorization: `Bearer ${token}` } }, null, (nextError) => { error = nextError; });
    assert.equal(error.code, "AUTH_UNAVAILABLE");
    assert.equal(error.status, 503);
  } finally {
    globalThis.fetch = originalFetch;
    if (oldUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = oldUrl;
    if (oldKey === undefined) delete process.env.SUPABASE_PUBLISHABLE_KEY;
    else process.env.SUPABASE_PUBLISHABLE_KEY = oldKey;
  }
});
