import {
  Briefcase,
  GearSix,
  House,
  PaperPlaneTilt,
  SidebarSimple,
  SignOut,
  ShieldCheck,
} from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/auth-context";
import { useProfile } from "../features/profile/profile-context";
import { getAdminAccess } from "../api/admin";
import BrandMark from "../components/BrandMark";
import { ThemeToggle } from "../components/Theme";
import "./AppShell.css";

const navigation = [
  { label: "Dashboard", path: "/dashboard", icon: House },
  { label: "Applications", path: "/applications", icon: Briefcase },
  { label: "Outreach", path: "/outreach", icon: PaperPlaneTilt },
  { label: "Settings", path: "/profile", icon: GearSix },
];

function Logo({ compact = false }) {
  return <BrandMark className={`shell-logo${compact ? " is-compact" : ""}`} showName={!compact} />;
}

function Navigation({ compact = false, mobile = false, isAdmin = false }) {
  const { pathname } = useLocation();
  const items = isAdmin ? [...navigation, { label: "Admin", path: "/admin", icon: ShieldCheck }] : navigation;
  return (
    <nav className={mobile ? `mobile-navigation${isAdmin ? " has-admin" : ""}` : "shell-navigation"}>
      {items.map(({ icon: Icon, label, path }) => (
        <NavLink
          key={path}
          to={path}
          aria-label={compact ? label : undefined}
          title={compact ? label : undefined}
          className={({ isActive }) => isActive || path === "/applications" && ["/interview-status", "/tracking-status"].includes(pathname) ? "is-active" : undefined}
        >
          <Icon size={mobile ? 22 : 19} weight="duotone" aria-hidden="true" />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

function ProfileAvatar({ profile }) {
  const [failedAvatar, setFailedAvatar] = useState(null);

  if (profile.avatar_url && profile.avatar_url !== failedAvatar) {
    return (
      <img
        src={profile.avatar_url}
        alt=""
        onError={() => setFailedAvatar(profile.avatar_url)}
      />
    );
  }

  return <span>{profile.display_name.slice(0, 1).toUpperCase()}</span>;
}

function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, signOut } = useAuth();
  const { profile } = useProfile();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const contentRef = useRef(null);

  useEffect(() => {
    let active = true;
    getAdminAccess()
      .then((result) => { if (active) setIsAdmin(Boolean(result.is_admin)); })
      .catch(() => { if (active) setIsAdmin(false); });
    return () => { active = false; };
  }, [session?.user?.id]);

  useEffect(() => {
    contentRef.current?.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className={`app-layout${isSidebarCollapsed ? " is-sidebar-collapsed" : ""}`}>
      <aside className="shell-sidebar">
        <header className="shell-brand-header">
          <Logo compact={isSidebarCollapsed} />
          <button
            className="sidebar-toggle"
            type="button"
            aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => setIsSidebarCollapsed((current) => !current)}
          >
            <SidebarSimple size={19} weight="duotone" aria-hidden="true" />
          </button>
        </header>

        <Navigation compact={isSidebarCollapsed} isAdmin={isAdmin} />

        <ThemeToggle className={isSidebarCollapsed ? "is-compact" : ""} />

        <footer className="shell-user">
          {isAdmin ? <span className="shell-user__admin-mark"><ShieldCheck size={21} weight="duotone" aria-hidden="true" /></span> : <ProfileAvatar profile={profile} />}
          <div>
            <strong>{isAdmin ? "Admin" : profile.display_name}</strong>
            <small>{session?.user?.email}</small>
          </div>
          <button type="button" onClick={signOut} aria-label="Sign out">
            <SignOut size={18} weight="duotone" />
          </button>
        </footer>
      </aside>

      <header className="mobile-header">
        <Logo />
        <ThemeToggle className="is-compact" />
        <button type="button" onClick={() => navigate("/profile")} aria-label="Open profile settings">
          <ProfileAvatar profile={profile} />
        </button>
      </header>

      <main ref={contentRef} className={`shell-content${location.pathname.startsWith("/applications") || ["/profile", "/interview-status", "/tracking-status", "/admin-view-all-users"].includes(location.pathname) ? " is-fixed" : ""}`}>
        <Outlet />
      </main>

      <Navigation mobile isAdmin={isAdmin} />
    </div>
  );
}

export default AppShell;
