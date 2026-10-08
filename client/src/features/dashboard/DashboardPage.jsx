import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Briefcase, CalendarCheck, ChartBar, ChartLineUp } from "@phosphor-icons/react";
import { apiRequest, invalidateRequestCache } from "../../api/client";
import LoadingSkeleton from "../../components/LoadingSkeleton";
import UpdatedAt from "../../components/UpdatedAt";
import { dashboardSummaryFromStats, dayKey, STAGES } from "./dashboard-data";
import StageDonut from "./StageDonut";
import SourceBreakdown from "./SourceBreakdown";
import "./DashboardPage.css";

const label = (value) => value === "interviewing" ? "Interview" : value.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
const dateLabel = (value) => new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(value);
export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const [calendarDate, setCalendarDate] = useState(() => new Date());

  const load = useCallback(async (isActive = () => true, manual = false) => {
    if (manual) invalidateRequestCache();
    setRefreshing(true);
    try {
      const stats = await apiRequest("/dashboard");
      if (isActive()) { setData(stats); setError(null); setLastUpdatedAt(new Date()); }
    } catch (loadError) {
      if (isActive()) setError(loadError.message);
    } finally {
      if (isActive()) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => load(() => active));
    return () => { active = false; };
  }, [load]);
  useEffect(() => {
    let timer;
    const scheduleNextDay = () => {
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0);
      timer = window.setTimeout(() => {
        setCalendarDate(new Date());
        scheduleNextDay();
      }, midnight.getTime() - Date.now());
    };
    scheduleNextDay();
    return () => window.clearTimeout(timer);
  }, []);
  const summary = useMemo(() => data ? dashboardSummaryFromStats(data, calendarDate, { includeOutreach: false }) : null, [data, calendarDate]);
  const todayKey = dayKey(calendarDate);
  const calendarMonths = summary?.days.filter((day) => day.inRange).reduce((groups, day) => {
    const key = `${day.date.getFullYear()}-${day.date.getMonth()}`;
    if (groups.at(-1)?.key !== key) groups.push({ key, name: new Intl.DateTimeFormat("en-IN", { month: "short" }).format(day.date), offset: day.date.getDay(), days: [] });
    groups.at(-1).days.push(day);
    return groups;
  }, []) || [];
  const topSource = summary?.sources[0];

  return <div className="app-shell dashboard-page">
    <header className="page-header"><div><h1>Dashboard</h1><p>See where your applications stand and what has moved forward.</p></div><div className="dashboard-header-actions"><UpdatedAt value={lastUpdatedAt} /><button className="button-secondary refresh-data-button" type="button" onClick={() => void load(() => true, true)} disabled={refreshing}>{refreshing ? "Refreshing…" : "Refresh data"}</button></div></header>
    {error && (data ? <p className="inline-error" role="alert">Could not load fresh dashboard data: {error} <button type="button" onClick={() => void load(() => true, true)} disabled={refreshing}>Try again</button></p> : <section className="dashboard-unavailable" role="alert"><h2>Dashboard data is unavailable</h2><p>{error}</p><button className="button-primary" type="button" onClick={() => void load(() => true, true)} disabled={refreshing}>{refreshing ? "Checking…" : "Try again"}</button></section>)}
    {!data && !error && <LoadingSkeleton type="dashboard" label="Loading dashboard" />}
    {summary && <>
      <div className="dashboard-overview" aria-label="Job search overview">
        <div className="dashboard-metric"><span className="dashboard-metric__icon"><Briefcase size={24} weight="duotone" aria-hidden="true" /></span><strong>{summary.total}</strong><span>Applications tracked</span></div>
        <div className="dashboard-metric"><span className="dashboard-metric__icon"><ChartLineUp size={24} weight="duotone" aria-hidden="true" /></span><strong>{summary.active}</strong><span>Active applications</span></div>
        <div className="dashboard-metric"><span className="dashboard-metric__icon"><CalendarCheck size={24} weight="duotone" aria-hidden="true" /></span><strong>{summary.applicationsLast30Days}</strong><span>Sent in the last 30 days</span></div>
        <div className="dashboard-metric"><span className="dashboard-metric__icon"><ChartBar size={24} weight="duotone" aria-hidden="true" /></span><strong className="dashboard-metric__source" title={topSource?.name}>{topSource?.name || "—"}</strong><span>{topSource ? `Top source · ${topSource.applications} tracked` : "Top source · no applications yet"}</span></div>
      </div>

      <div className="dashboard-top">
        <section className="dashboard-panel dashboard-pipeline" aria-labelledby="pipeline-heading">
          <div className="dashboard-heading"><h2 id="pipeline-heading">Application pipeline</h2><p>Where your tracked roles stand now.</p></div>
          <StageDonut counts={summary.counts} stages={STAGES} title="Your application stages" />
        </section>

        <section className="dashboard-panel dashboard-sources" aria-labelledby="sources-heading">
          <div className="dashboard-heading"><h2 id="sources-heading">Application sources</h2><p>See which places led to your tracked roles.</p></div>
          <SourceBreakdown sources={summary.sources} emptyMessage="Your sources will appear when you track an application." />
        </section>
      </div>

      <section className="dashboard-panel dashboard-calendar" aria-labelledby="calendar-heading">
        <div className="dashboard-calendar__header">
          <div className="dashboard-heading"><h2 id="calendar-heading">Application activity</h2><p>{summary.applicationActivity} applications sent in the past 365 days.</p></div>
          <div className="dashboard-calendar__stats"><span><strong>{summary.activeDays}</strong> active days</span><span><strong>{summary.maxStreak}</strong> longest streak</span><span><strong>{summary.currentStreak}</strong> current streak</span></div>
        </div>
        <div className="dashboard-calendar__content">
          <div className="dashboard-calendar__heatmap">
            <div className="dashboard-calendar__viewport" tabIndex="0" aria-label="Scroll activity calendar horizontally">
              <div className="dashboard-calendar__months" role="img" aria-label="Daily application activity over the past 365 days, grouped by month">
                {calendarMonths.map((month) => <div className="dashboard-calendar__month" key={month.key} style={{ "--month-weeks": Math.ceil((month.offset + month.days.length) / 7) }}>
                  <div className="dashboard-calendar__month-grid">
                    {Array.from({ length: month.offset }, (_, index) => <span key={`padding-${index}`} className="dashboard-calendar__cell is-padding" aria-hidden="true" />)}
                    {month.days.map((day) => {
                      const isToday = day.key === todayKey;
                      const detail = `${isToday ? "Today · " : ""}${dateLabel(day.date)}: ${day.applications} applications sent`;
                      return <span key={day.key} className={`dashboard-calendar__cell level-${Math.min(day.applications, 4)}${isToday ? " is-today" : ""}`} title={detail} aria-label={detail} />;
                    })}
                  </div>
                  <span className="dashboard-calendar__month-label">{month.name}</span>
                </div>)}
              </div>
            </div>
            <p className="dashboard-calendar__hint">Each square is one day. The outlined square is today; darker green means more applications sent.</p>
          </div>
          <aside className="dashboard-calendar__mix" aria-label="Application days"><h3>Application days</h3><p>Days with at least one application sent.</p><StageDonut counts={{ active: summary.activeDays, quiet: 365 - summary.activeDays }} stages={["active", "quiet"]} centerLabel="days" title="Application days in the past 365 days" colors={["#0f6e56", "var(--color-border)"]} /></aside>
        </div>
      </section>

      <section className="dashboard-panel dashboard-recent" aria-labelledby="recent-heading">
        <div className="dashboard-heading"><h2 id="recent-heading">Recent applications</h2><p>Open a role to review its latest stage.</p></div>
        {summary.recent.length ? <ul>{summary.recent.map((item) => <li key={`${item.kind}-${item.id}`}>
          <Link to={`/interview-status?applicationId=${item.id}`}>
            <span className="dashboard-recent__icon" aria-hidden="true"><Briefcase size={18} weight="duotone" /></span>
            <span className="dashboard-recent__details"><strong>{item.job_title}</strong><small>{item.company_name}</small></span>
            <span className="dashboard-recent__status">{label(item.status)}</span>
          </Link>
        </li>)}</ul> : <p className="dashboard-empty">Your latest work will appear here.</p>}
      </section>
    </>}
  </div>;
}
