import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Briefcase, Database, Pulse, ShieldCheck, ShieldSlash, UsersThree, WarningCircle } from "@phosphor-icons/react";
import { Link } from "react-router-dom";
import { getAdminSummary, getAdminUsers } from "../../api/admin";
import { invalidateRequestCache } from "../../api/client";
import LoadingSkeleton from "../../components/LoadingSkeleton";
import UpdatedAt from "../../components/UpdatedAt";
import StageDonut from "../dashboard/StageDonut";
import SourceBreakdown from "../dashboard/SourceBreakdown";
import ApiPerformanceChart from "./ApiPerformanceChart";
import "./AdminPage.css";

const stages = ["saved", "applied", "screening", "interviewing", "offered", "rejected", "ghosted", "withdrawn"];
const number = (value) => Number(value || 0).toLocaleString("en-IN");

export default function AdminPage() {
  const [summary, setSummary] = useState(null);
  const [recentUsers, setRecentUsers] = useState([]);
  const [state, setState] = useState("loading");
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const [browserOnline, setBrowserOnline] = useState(() => navigator.onLine);

  const load = useCallback(async (isActive = () => true, preserveData = false) => {
    try {
      const [nextSummary, users] = await Promise.all([getAdminSummary(), getAdminUsers(1)]);
      if (!isActive()) return;
      setSummary(nextSummary);
      setRecentUsers(users.users || []);
      setLastUpdatedAt(new Date());
      setRefreshError(false);
      setState("ready");
    } catch (error) {
      if (!isActive()) return;
      if (error.status === 403 || error.code === "ADMIN_SETUP_REQUIRED") {
        setState(error.code === "ADMIN_SETUP_REQUIRED" ? "setup" : "denied");
      } else if (preserveData) {
        setRefreshError(true);
      } else {
        setState("unavailable");
      }
    }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => load(() => active));
    return () => { active = false; };
  }, [load]);
  useEffect(() => {
    const updateConnection = () => setBrowserOnline(navigator.onLine);
    window.addEventListener("online", updateConnection);
    window.addEventListener("offline", updateConnection);
    return () => {
      window.removeEventListener("online", updateConnection);
      window.removeEventListener("offline", updateConnection);
    };
  }, []);
  async function refresh() { setRefreshing(true); invalidateRequestCache(); await load(() => true, true); setRefreshing(false); }

  const showAccessState = ["denied", "setup", "unavailable"].includes(state);
  const operations = summary?.operations;
  const api = operations?.api;
  const connectionLabel = !browserOnline ? "Device offline" : refreshing ? "Checking API…" : refreshError ? "Latest API request failed" : "Last API check passed";
  const connectionHealthy = browserOnline && !refreshing && !refreshError;

  return <div className={`app-shell admin-page${showAccessState ? " admin-page--access" : ""}`}>
    {state === "ready" && <header className="page-header">
      <div><h1>Admin dashboard</h1><p>Review members, applications, and service health.</p></div>
      <div className="admin-header-actions"><span className={`admin-connection${connectionHealthy ? " admin-connection--healthy" : ""}`} role="status"><span className="admin-connection__dot" aria-hidden="true" />{connectionLabel}</span><UpdatedAt value={lastUpdatedAt} /><button type="button" className="button-secondary refresh-data-button" onClick={refresh} disabled={refreshing}>{refreshing ? "Refreshing…" : "Refresh data"}</button><Link className="button-primary" to="/dashboard">Back to user dashboard</Link></div>
    </header>}
    {refreshError && state === "ready" && <p className="inline-error" role="alert">Could not load fresh admin data. The last successful results are still shown. <button type="button" onClick={refresh} disabled={refreshing}>Try again</button></p>}
    {state === "loading" && <LoadingSkeleton type="admin" label="Loading admin dashboard" />}
    {showAccessState && <section className="admin-access-state" role={state === "unavailable" || state === "setup" ? "alert" : undefined}>
      <div className="admin-access-state__icon">{state === "denied" ? <ShieldSlash size={28} weight="duotone" aria-hidden="true" /> : <WarningCircle size={28} weight="duotone" aria-hidden="true" />}</div>
      <h2>{state === "denied" ? "You don’t have access to this page" : state === "setup" ? "Admin access needs setup" : "Admin dashboard is unavailable"}</h2>
      <p>{state === "denied" ? "Your account can still use the regular Concourse workspace." : state === "setup" ? "The local admin tables have not been created yet. Run the local admin migration, then grant your account access." : browserOnline ? "The admin API request failed. Check the server connection, then try again." : "Your device is offline. Reconnect, then try again."}</p>
      {state === "unavailable" && <button type="button" className="button-secondary" onClick={() => void load()}>Try again</button>}
      <Link className="button-primary" to="/dashboard">Back to dashboard</Link>
    </section>}
    {state === "ready" && summary && <>
      <section className="admin-metrics" aria-label="Product totals">
        <Link to="/admin-view-all-users"><span className="admin-metric-icon"><UsersThree size={24} weight="duotone" aria-hidden="true" /></span><span>Members with profiles</span><strong>{number(summary.members)}</strong><small>+{number(summary.new_members_7d)} in the last 7 days <ArrowRight size={14} aria-hidden="true" /></small></Link>
        <div><span className="admin-metric-icon"><Briefcase size={24} weight="duotone" aria-hidden="true" /></span><span>Applications tracked</span><strong>{number(summary.applications)}</strong><small>Across all members</small></div>
      </section>
      <div className="admin-grid">
        <section className="admin-panel" aria-labelledby="admin-pipeline-heading">
          <div className="admin-panel-heading"><h2 id="admin-pipeline-heading">Application pipeline</h2><p>Where members’ tracked roles stand now.</p></div>
          <StageDonut counts={summary.stages || {}} stages={stages} title="All members' application stages" />
        </section>
        <section className="admin-panel" aria-labelledby="admin-api-heading">
          <div className="admin-panel-heading"><h2 id="admin-api-heading">API performance</h2><p>Request volume and average response time over the past hour.</p></div>
          {api?.status === "unavailable" ? <p className="admin-chart-empty">Metrics are unavailable. Check the Analytics Engine bindings.</p> : <>
            <div className="admin-api-stats"><div><strong>{number(api?.requests)}</strong><span>Requests</span></div><div><strong>{number(api?.errors)}</strong><span>Server errors</span></div><div><strong>{api?.average_ms == null ? "—" : `${number(api.average_ms)} ms`}</strong><span>Average response</span></div></div>
            <ApiPerformanceChart series={api?.series || []} />
          </>}
        </section>
      </div>
      <div className="admin-grid admin-grid--insights">
        <section className="admin-panel admin-source-panel" aria-labelledby="admin-sources-heading">
          <div className="admin-panel-heading"><h2 id="admin-sources-heading">Applications by source</h2><p>Where members tracked roles and marked them applied.</p></div>
          <SourceBreakdown sources={summary.sources} compareSent emptyMessage="Sources will appear when members track applications." />
        </section>
        <section className="admin-panel admin-health-panel" aria-labelledby="admin-health-heading">
          <div className="admin-panel-heading"><h2 id="admin-health-heading">Service health</h2><p>Current database and API signals.</p></div>
          <div className="admin-health-body">
            <dl className="admin-health-list">
              <div><dt><Database size={19} aria-hidden="true" />Database</dt><dd className={operations?.database?.status === "connected" ? "is-healthy" : ""}>{operations?.database?.status === "connected" ? "Connected" : "Unavailable"}</dd></div>
              <div><dt><Pulse size={19} aria-hidden="true" />API telemetry</dt><dd>{api?.status === "unavailable" ? "Unavailable" : "Collecting"}</dd></div>
              <div><dt><ShieldCheck size={19} aria-hidden="true" />Server error rate · past hour</dt><dd>{api?.status === "unavailable" || !api?.requests ? "—" : `${(100 * api.errors / api.requests).toFixed(1)}%`}</dd></div>
            </dl>
            <p className="admin-health-note">Request counts, errors, and response time cover the past 60 minutes. “—” means no data.</p>
          </div>
        </section>
      </div>
      <section className="admin-panel" aria-labelledby="admin-users-heading">
        <div className="admin-panel-heading admin-panel-heading--split"><div><h2 id="admin-users-heading">Recent members</h2><p>People who recently completed their profiles.</p></div><Link to="/admin-view-all-users">View all users <ArrowRight size={15} aria-hidden="true" /></Link></div>
        {recentUsers.length ? <ul className="admin-recent-users">{recentUsers.slice(0, 5).map((user) => <li key={user.user_id}><span className="admin-recent-avatar" aria-hidden="true">{user.display_name?.[0]?.toUpperCase() || "?"}</span><span><strong>{user.display_name}</strong><small>{user.email}</small></span><time dateTime={user.created_at}>{new Date(user.created_at).toLocaleDateString("en-IN")}</time></li>)}</ul> : <p className="admin-chart-empty">No member profiles yet.</p>}
      </section>
    </>}
  </div>;
}
