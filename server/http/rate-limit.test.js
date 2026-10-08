import assert from "node:assert/strict";
import test from "node:test";
import { createRateLimiter } from "./rate-limit.js";

test("limits one caller without affecting another and resets after a minute", () => {
  let time = 0;
  const allow = createRateLimiter(() => time);
  for (let i = 0; i < 180; i += 1) assert.equal(allow("user-a"), true);
  assert.equal(allow("user-a"), false);
  assert.equal(allow("user-b"), true);
  time = 60_000;
  assert.equal(allow("user-a"), true);
});
