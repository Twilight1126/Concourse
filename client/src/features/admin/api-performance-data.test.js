import assert from "node:assert/strict";
import test from "node:test";
import { groupApiMinutes } from "./api-performance-data.js";

test("five-minute bars preserve exact request and server-error totals", () => {
  const series = Array.from({ length: 60 }, (_, index) => ({
    minute: new Date(Date.UTC(2026, 9, 8, 8, index)).toISOString(),
    requests: index % 10 === 0 ? 3 : 0,
    errors: index === 50 ? 1 : 0,
  }));
  const bars = groupApiMinutes(series);
  assert.equal(bars.length, 12);
  assert.equal(bars[0].requests, 3);
  assert.equal(bars[1].requests, 0);
  assert.equal(bars[10].errors, 1);
  assert.equal(bars.reduce((sum, bar) => sum + bar.requests, 0), 18);
  assert.equal(bars.reduce((sum, bar) => sum + bar.errors, 0), 1);
  assert.equal(bars[11].end, series[59].minute);
});
