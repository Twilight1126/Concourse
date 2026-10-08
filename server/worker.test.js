import assert from "node:assert/strict";
import test from "node:test";
import worker from "./worker.js";

test("Worker limits API calls before routing and leaves page assets alone", async () => {
  const keys = [];
  const env = {
    API_RATE_LIMIT: { limit: async ({ key }) => { keys.push(key); return { success: false }; } },
    ASSETS: { fetch: async () => new Response("page") },
  };
  const apiResponse = await worker.fetch(new Request("https://example.test/api/health"), env);
  assert.equal(apiResponse.status, 429);
  assert.equal(apiResponse.headers.get("Retry-After"), "60");
  assert.equal(apiResponse.headers.get("Cache-Control"), "no-store");
  assert.equal(keys.length, 1);
  assert.equal(keys[0].length, 32);
  const pageResponse = await worker.fetch(new Request("https://example.test/dashboard"), env);
  assert.equal(await pageResponse.text(), "page");
  assert.equal(keys.length, 1);
});
