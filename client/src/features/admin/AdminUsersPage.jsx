import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { getAdminUsers } from "../../api/admin";
import LoadingSkeleton from "../../components/LoadingSkeleton";
import "./AdminUsersPage.css";

const columns = [
  ["email", "Email"], ["phone", "Phone"], ["location", "Location"], ["timezone", "Time zone"],
  ["present_company", "Current company"], ["current_job_title", "Current role"],
  ["years_of_experience", "Experience (years)"], ["skills", "Skills"], ["preferred_roles", "Preferred roles"],
  ["current_ctc", "Current salary"], ["expected_ctc", "Expected salary"], ["currency", "Currency"],
  ["notice_period_days", "Notice (days)"], ["portfolio_url", "Portfolio"],
  ["linkedin_url", "LinkedIn"], ["created_at", "Joined"], ["updated_at", "Updated"],
];

function cellValue(user, field) {
  const value = user[field];
  if (value === null || value === undefined || value === "") return "—";
  if (field === "created_at" || field === "updated_at") return new Date(value).toLocaleDateString("en-IN");
  if (["current_ctc", "expected_ctc"].includes(field)) return `${user.currency || ""} ${Number(value).toLocaleString("en-IN")}`.trim();
  if (["portfolio_url", "linkedin_url"].includes(field)) {
    try {
      const url = new URL(value);
      if (!["https:", "http:"].includes(url.protocol)) return value;
      return <a href={url.href} target="_blank" rel="noopener noreferrer">Open link</a>;
    } catch { return value; }
  }
  return value;
}

function MemberAvatar({ user }) {
  return <span className="admin-user-avatar" aria-hidden="true">{(user.display_name?.[0] || "?").toUpperCase()}</span>;
}

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const timeout = setTimeout(() => {
      const nextQuery = search.trim();
      if (nextQuery === query) return;
      setQuery(nextQuery);
      setPage(1);
      setLoading(true);
    }, 250);
    return () => clearTimeout(timeout);
  }, [search, query]);

  useEffect(() => {
    let active = true;
    getAdminUsers(page, query)
      .then((data) => { if (active) { setResult(data); setError(""); } })
      .catch((failure) => { if (active) setError(failure.status === 403 ? "You don’t have access to the users list." : "Couldn’t load users. Try again."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, query]);

  const total = Number(result?.total || 0);
  const pageCount = Math.max(1, Math.ceil(total / 10));
  const loadedPage = Number(result?.page || 1);
  return <div className="app-shell admin-users-page">
    <header className="page-header">
      <div><h1>All users</h1><p>Review the profiles members have completed.</p></div>
      <Link className="button-primary" to="/admin">Back to admin dashboard</Link>
    </header>
    <section className="applications-panel admin-users-panel" aria-labelledby="admin-users-heading">
      <div className="section-heading"><div><h2 id="admin-users-heading">Member directory</h2><p>{total.toLocaleString("en-IN")} profiles</p></div></div>
      <div className="tracker-toolbar admin-users-toolbar">
        <label className="tracker-search"><MagnifyingGlass size={18} /><span className="sr-only">Search users by name or email</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or email" /></label>
      </div>
      {loading && !result && <LoadingSkeleton label="Loading users" />}
      {loading && result && <p className="tracker-loading-note" role="status">Updating users…</p>}
      {error && <p className="inline-error" role="alert">{error}</p>}
      {!error && !loading && total === 0 && <p className="empty-state">No profiles match this search.</p>}
      {!error && result && total > 0 && <>
        <div className="admin-users-scroll" tabIndex={0} role="region" aria-label="Users table, scroll to see all profile fields">
          <table className="admin-users-table">
            <thead><tr><th scope="col">Profile</th><th scope="col">Name</th>{columns.map(([field, label]) => <th scope="col" key={field}>{label}</th>)}</tr></thead>
            <tbody>{result.users.map((user) => <tr key={user.user_id}>
              <td><MemberAvatar user={user} /></td>
              <td><strong>{user.display_name || "—"}</strong></td>
              {columns.map(([field]) => <td key={field}>{cellValue(user, field)}</td>)}
            </tr>)}</tbody>
          </table>
        </div>
        <nav className="tracker-pagination" aria-label="Users pagination">
          <span>Showing {(loadedPage - 1) * 10 + 1}–{Math.min(loadedPage * 10, total)} of {total}</span>
          <div><button type="button" disabled={loadedPage <= 1 || loading} onClick={() => { setLoading(true); setPage(loadedPage - 1); }}>Previous</button><strong>Page {loadedPage} of {pageCount}</strong><button type="button" disabled={loadedPage >= pageCount || loading} onClick={() => { setLoading(true); setPage(loadedPage + 1); }}>Next</button></div>
        </nav>
      </>}
    </section>
  </div>;
}
