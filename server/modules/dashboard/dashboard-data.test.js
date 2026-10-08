import assert from "node:assert/strict";
import { test } from "node:test";
import { dashboardSummaryFromStats } from "../../../client/src/features/dashboard/dashboard-data.js";

test("dashboard renders bounded aggregates with counts, source replies, and recent activity", () => {
  const summary = dashboardSummaryFromStats({
    stage_counts: [{ status: "applied", total: 2 }, { status: "rejected", total: 1 }],
    sources: [{ name: "LinkedIn", applications: 3, interviews: 1, offers: 0 }],
    source_replies: [{ name: "LinkedIn", replies: 1 }],
    application_activity: [{ day: "2026-10-06", applications: 2 }],
    outreach_activity: [{ day: "2026-10-06", outreach: 1 }],
    outreach_totals: { sent: 2, replied: 1 },
    recent: [{ kind: "application", id: 1, status: "applied" }],
  }, new Date(2026, 9, 6));
  assert.equal(summary.total, 3);
  assert.equal(summary.active, 2);
  assert.equal(summary.responseRate, 50);
  assert.equal(summary.sources[0].replies, 1);
  assert.equal(summary.totalActivity, 3);
  assert.equal(summary.recent.length, 1);
});
