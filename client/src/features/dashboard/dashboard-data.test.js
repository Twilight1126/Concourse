import assert from "node:assert/strict";
import test from "node:test";
import { dashboardSummaryFromStats } from "./dashboard-data.js";

test("activity calendar shows exactly the rolling 365 days and excludes earlier activity", () => {
  const summary = dashboardSummaryFromStats({
    stage_counts: [{ status: "applied", total: 2 }], sources: [], source_replies: [],
    application_activity: [
      { day: "2025-10-07", applications: 5 },
      { day: "2025-10-08", applications: 1 },
      { day: "2026-10-07", applications: 1 },
    ],
    outreach_activity: [], outreach_totals: { sent: 0, replied: 0 }, recent: [],
  }, new Date(2026, 9, 7));
  const visible = summary.days.filter((day) => day.inRange);
  assert.equal(visible.length, 365);
  assert.equal(visible[0].key, "2025-10-08");
  assert.equal(visible.at(-1).key, "2026-10-07");
  assert.equal(summary.totalActivity, 2);
  assert.equal(summary.applicationActivity + summary.outreachActivity, summary.totalActivity);
  assert.equal(summary.activeDays, 2);
  assert.equal(summary.total, 2);
});

test("the next day adds an empty today square and drops the oldest day", () => {
  const stats = {
    stage_counts: [], sources: [], recent: [],
    application_activity: [
      { day: "2025-10-08", applications: 2 },
      { day: "2026-10-07", applications: 1 },
    ],
  };
  const yesterday = dashboardSummaryFromStats(stats, new Date(2026, 9, 7), { includeOutreach: false });
  const today = dashboardSummaryFromStats(stats, new Date(2026, 9, 8), { includeOutreach: false });
  const visible = today.days.filter((day) => day.inRange);
  assert.equal(yesterday.applicationActivity, 3);
  assert.equal(today.applicationActivity, 1);
  assert.equal(visible.length, 365);
  assert.equal(visible[0].key, "2025-10-09");
  assert.deepEqual([visible.at(-1).key, visible.at(-1).applications], ["2026-10-08", 0]);
});

test("application-only dashboard hides outreach without changing stored activity", () => {
  const stats = {
    stage_counts: [{ status: "applied", total: 1 }], sources: [], source_replies: [],
    application_activity: [{ day: "2026-10-07", applications: 1 }],
    outreach_activity: [{ day: "2026-10-07", outreach: 2 }],
    outreach_totals: { sent: 2, replied: 1 },
    recent: [
      { id: "application-1", kind: "application" },
      { id: "outreach-1", kind: "outreach" },
    ],
  };
  const summary = dashboardSummaryFromStats(stats, new Date(2026, 9, 7), { includeOutreach: false });
  assert.equal(summary.totalActivity, 1);
  assert.equal(summary.activeDays, 1);
  assert.equal(summary.days.find((day) => day.key === "2026-10-07").outreach, 0);
  assert.deepEqual(summary.recent.map((item) => item.id), ["application-1"]);
  assert.equal(stats.outreach_activity[0].outreach, 2);
});

test("application-only API response needs no outreach fields", () => {
  const summary = dashboardSummaryFromStats({
    stage_counts: [{ status: "offered", total: 1 }], sources: [],
    application_activity: [], recent: [{ id: 1, kind: "application" }],
  }, new Date(2026, 9, 7), { includeOutreach: false });
  assert.equal(summary.total, 1);
  assert.equal(summary.counts.offered, 1);
  assert.equal(summary.totalActivity, 0);
  assert.equal(summary.recent.length, 1);
});

test("the 30-day summary counts sent applications, including the boundary day", () => {
  const summary = dashboardSummaryFromStats({
    stage_counts: [{ status: "applied", total: 3 }], sources: [],
    application_activity: [
      { day: "2026-09-07", applications: 8 },
      { day: "2026-09-08", applications: 1 },
      { day: "2026-10-07", applications: 2 },
    ], recent: [],
  }, new Date(2026, 9, 7), { includeOutreach: false });
  assert.equal(summary.applicationsLast30Days, 3);
});
