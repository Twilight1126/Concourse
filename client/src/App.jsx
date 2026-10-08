import { Navigate, Route, Routes } from "react-router-dom";
import ApplicationsPage from "./features/applications/ApplicationsPage";
import TrackingStatusPage from "./features/applications/TrackingStatusPage";
import DashboardPage from "./features/dashboard/DashboardPage";
import ProfilePage from "./features/profile/ProfilePage";
import OutreachPage from "./features/outreach/OutreachPage";
import CaptureBridge from "./features/capture/CaptureBridge";
import AdminPage from "./features/admin/AdminPage";
import AdminUsersPage from "./features/admin/AdminUsersPage";
import AppShell from "./layout/AppShell";
import "./App.css";

function App() {
  return (
    <><CaptureBridge /><Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="applications" element={<ApplicationsPage />} />
        <Route path="applications/add" element={<ApplicationsPage />} />
        <Route path="applications/:applicationId/edit" element={<ApplicationsPage />} />
        <Route path="interview-status" element={<TrackingStatusPage />} />
        <Route path="tracking-status" element={<TrackingStatusPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="outreach" element={<OutreachPage />} />
        <Route path="admin" element={<AdminPage />} />
        <Route path="admin-view-all-users" element={<AdminUsersPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes></>
  );
}

export default App;
