import assert from "node:assert/strict";
import test from "node:test";
import { cachedRequest, invalidateRequestCache } from "./request-cache.js";

test("simultaneous reads share one request and a short-lived result", async () => {
  invalidateRequestCache();
  let calls = 0;
  const load = () => { calls += 1; return { items: [1] }; };
  const [first, second] = await Promise.all([cachedRequest("user:page", load), cachedRequest("user:page", load)]);
  assert.deepEqual(first, second);
  assert.equal(calls, 1);
  await cachedRequest("user:page", load);
  assert.equal(calls, 1);
});

test("invalidated in-flight reads cannot repopulate the cache", async () => {
  invalidateRequestCache();
  let finish;
  const old = cachedRequest("user:page", () => new Promise((resolve) => { finish = resolve; }));
  await Promise.resolve();
  invalidateRequestCache();
  finish("old");
  await old;
  assert.equal(await cachedRequest("user:page", () => "new"), "new");
});

test("sensitive reads can share an in-flight call without retaining the result", async () => {
  invalidateRequestCache();
  let calls = 0;
  const load = () => ++calls;
  await Promise.all([cachedRequest("admin", load, 0), cachedRequest("admin", load, 0)]);
  assert.equal(calls, 1);
  assert.equal(await cachedRequest("admin", load, 0), 2);
});
