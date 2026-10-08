import assert from "node:assert/strict";
import test from "node:test";
import { dashboardSummary, dashboardSummaryFromStats, sourceGroup } from "./dashboard-data.js";

test("dashboard combines sent applications and outreach without counting saved jobs as activity", () => {
  const applications = [
    { id: 1, status: "saved", source: "LinkedIn", created_at: "2026-10-01T09:00:00", applied_at: null },
    { id: 2, status: "interviewing", source: "LinkedIn", applied_at: "2026-10-03T09:00:00", follow_up_at: "2026-10-05T09:00:00" },
    { id: 3, status: "ghosted", source: "Careers", applied_at: "2026-10-04T09:00:00", follow_up_at: "2026-10-05T09:00:00" },
  ];
  const outreach = [
    { id: 1, status: "replied", related_application_id: 2, sent_at: "2026-10-04T11:00:00" },
    { id: 2, status: "sent", sent_at: "2026-10-05T11:00:00", follow_up_at: "2026-10-05T12:00:00" },
    { id: 3, status: "draft", sent_at: null },
  ];
  const result = dashboardSummary(applications, outreach, new Date("2026-10-06T12:00:00"));
  assert.equal(result.total, 3);
  assert.equal(result.active, 1);
  assert.equal(result.ghosted, 1);
  assert.equal(result.responseRate, 50);
  assert.equal(result.totalActivity, 4);
  assert.equal(result.applicationActivity, 2);
  assert.equal(result.outreachActivity, 2);
  assert.equal(result.activeDays, 3);
  assert.equal(result.maxStreak, 3);
  assert.equal(result.currentStreak, 3);
  assert.equal(result.sources.find((source) => source.name === "LinkedIn").replies, 1);
  assert.deepEqual(result.days.find((day) => day.key === "2026-10-04") && [result.days.find((day) => day.key === "2026-10-04").applications, result.days.find((day) => day.key === "2026-10-04").outreach], [1, 1]);
});

test("job boards remain separate while employer career sites share a company portal group", () => {
  assert.equal(sourceGroup({ source: "LinkedIn", job_url: "https://careers.adobe.com/job/1" }), "LinkedIn");
  assert.equal(sourceGroup({ source: "job-boards.greenhouse.io" }), "Company portal");
  assert.equal(sourceGroup({ source: "tario.talismatic.com" }), "Company portal");
  assert.equal(sourceGroup({ source: "indeed.com" }), "Indeed");
  assert.equal(sourceGroup({ source: "monsterindia.com" }), "Monster");
  assert.equal(sourceGroup({ source: "instahyre.com" }), "Instahyre");
  assert.equal(sourceGroup({ source: "Cutshort", job_url: "https://cutshort.io/job/1" }), "Cutshort");
  assert.equal(sourceGroup({ source: "JobStreet" }), "JobStreet");
  assert.equal(sourceGroup({ source: "Greenhouse", job_url: "https://job-boards.greenhouse.io/company" }), "Company portal");
  assert.equal(sourceGroup({ source: "company_portal", job_url: "https://careers.example.com/job/1" }), "Company portal");
  assert.equal(sourceGroup({ source: "Company website", job_url: "https://careers.example.com/job/1" }), "Company portal");
  assert.equal(sourceGroup({ source: "Adobe Careers", job_url: "https://careers.adobe.com/job/1" }), "Company portal");
  assert.equal(sourceGroup({ source: "Adobe Careers", job_url: "https://careers.adobe.com/job/1?utm_source=linkedin" }), "Company portal");
  assert.equal(sourceGroup({ source: "jobs.example.com", job_url: "https://jobs.example.com/job/1" }), "Company portal");
  assert.equal(sourceGroup({}), "Manual");
  assert.equal(sourceGroup({ source: "Manual" }), "Manual");
  assert.equal(sourceGroup({ source: "Manual / unknown" }), "Manual");
  const summary = dashboardSummary([
    { id: 1, source: "job-boards.greenhouse.io", status: "applied" },
    { id: 2, source: "tario.talismatic.com", status: "saved" },
    { id: 3, source: "LinkedIn", status: "applied" },
  ], [], new Date("2026-10-06T12:00:00"));
  assert.equal(summary.sources.find((source) => source.name === "Company portal").applications, 2);
  assert.equal(summary.sources.find((source) => source.name === "LinkedIn").applications, 1);
  assert.equal(summary.responseRate, null);
});

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
