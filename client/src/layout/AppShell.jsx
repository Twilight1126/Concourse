import {
  Briefcase,
  GearSix,
  House,
  PaperPlaneTilt,
  SidebarSimple,
  SignOut,
} from "@phosphor-icons/react";
import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/auth-context";
import { useProfile } from "../features/profile/profile-context";
import "./AppShell.css";

const navigation = [
  { label: "Dashboard", path: "/dashboard", icon: House },
  { label: "Applications", path: "/applications", icon: Briefcase },
  { label: "Outreach", path: "/outreach", icon: PaperPlaneTilt },
  { label: "Settings", path: "/profile", icon: GearSix },
];

function Logo({ compact = false }) {
  return (
    <div className={`shell-logo${compact ? " is-compact" : ""}`}>
      <span>C</span>
      <strong>Concourse</strong>
    </div>
  );
}

function Navigation({ compact = false, mobile = false }) {
  return (
    <nav className={mobile ? "mobile-navigation" : "shell-navigation"}>
      {navigation.map(({ icon: Icon, label, path }) => (
        <NavLink
          key={path}
          to={path}
          aria-label={compact ? label : undefined}
          title={compact ? label : undefined}
          className={({ isActive }) => isActive ? "is-active" : undefined}
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
  const { session, signOut } = useAuth();
  const { profile } = useProfile();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

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

        <Navigation compact={isSidebarCollapsed} />

        <footer className="shell-user">
          <ProfileAvatar profile={profile} />
          <div>
            <strong>{profile.display_name}</strong>
            <small>{session?.user?.email}</small>
          </div>
          <button type="button" onClick={signOut} aria-label="Sign out">
            <SignOut size={18} weight="duotone" />
          </button>
        </footer>
      </aside>

      <header className="mobile-header">
        <Logo />
        <button type="button" onClick={() => navigate("/profile")} aria-label="Open profile settings">
          <ProfileAvatar profile={profile} />
        </button>
      </header>

      <main className="shell-content">
        <Outlet />
      </main>

      <Navigation mobile />
    </div>
  );
}

export default AppShell;
