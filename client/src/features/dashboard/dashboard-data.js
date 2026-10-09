export const STAGES = ["saved", "applied", "screening", "interviewing", "offered", "rejected", "ghosted", "withdrawn"];
export const STAGE_COLORS = ["#a9bbb1", "#317e67", "#75ae96", "#c4933e", "#145c45", "#bc6257", "#89939e", "#b8b7ac"];
const ACTIVE = new Set(["applied", "screening", "interviewing", "offered"]);
export function dayKey(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function activityCalendar(activity, now) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = new Date(today);
  start.setDate(start.getDate() - 364);
  const padding = start.getDay();
  const days = Array.from({ length: 365 + padding }, (_, index) => {
    const date = new Date(start);
    date.setDate(date.getDate() + index - padding);
    const key = dayKey(date);
    return { key, date, inRange: index >= padding, applications: activity.get(key)?.applications || 0, outreach: activity.get(key)?.outreach || 0 };
  });
  const visibleDays = days.filter((day) => day.inRange);
  const activeDays = new Set(visibleDays.filter((day) => day.applications + day.outreach > 0).map((day) => day.key));
  let maxStreak = 0;
  let run = 0;
  for (const day of visibleDays) {
    run = activeDays.has(day.key) ? run + 1 : 0;
    maxStreak = Math.max(maxStreak, run);
  }
  const latest = activeDays.has(dayKey(today)) ? today : new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  let currentStreak = 0;
  for (let date = latest; activeDays.has(dayKey(date)); date.setDate(date.getDate() - 1)) currentStreak += 1;
  return {
    days, activeDays: activeDays.size, maxStreak, currentStreak,
    applicationsLast30Days: visibleDays.slice(-30).reduce((sum, day) => sum + day.applications, 0),
    applicationActivity: visibleDays.reduce((sum, day) => sum + day.applications, 0),
    outreachActivity: visibleDays.reduce((sum, day) => sum + day.outreach, 0),
    totalActivity: visibleDays.reduce((sum, day) => sum + day.applications + day.outreach, 0),
  };
}

export function dashboardSummaryFromStats(stats, now = new Date(), { includeOutreach = true } = {}) {
  const counts = Object.fromEntries(STAGES.map((stage) => [stage, 0]));
  for (const row of stats.stage_counts) if (Object.hasOwn(counts, row.status)) counts[row.status] = Number(row.total);
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  const activity = new Map();
  const activityRows = includeOutreach
    ? [[stats.application_activity, "applications"], [stats.outreach_activity ?? [], "outreach"]]
    : [[stats.application_activity, "applications"]];
  for (const [rows, kind] of activityRows) {
    for (const row of rows) {
      const key = String(row.day).slice(0, 10);
      const day = activity.get(key) ?? { applications: 0, outreach: 0 };
      day[kind] += Number(row[kind]);
      activity.set(key, day);
    }
  }
  const calendar = activityCalendar(activity, now);
  const replies = new Map((stats.source_replies ?? []).map((row) => [row.name, Number(row.replies)]));
  const sources = stats.sources.map((row) => ({
    name: row.name, applications: Number(row.applications),
    interviews: Number(row.interviews), offers: Number(row.offers),
    replies: replies.get(row.name) ?? 0,
  })).sort((a, b) => b.applications - a.applications || a.name.localeCompare(b.name));
  const sent = Number(stats.outreach_totals?.sent ?? 0);
  return {
    total, active: [...ACTIVE].reduce((sum, stage) => sum + counts[stage], 0),
    responseRate: sent ? Math.round(100 * Number(stats.outreach_totals.replied) / sent) : null,
    ghosted: counts.ghosted, counts, sources, ...calendar,
    recent: includeOutreach ? stats.recent : stats.recent.filter((item) => item.kind !== "outreach"),
  };
}
