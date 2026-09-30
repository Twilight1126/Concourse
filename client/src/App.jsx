import { Navigate, Route, Routes } from "react-router-dom";
import ComingSoonPage from "./components/ComingSoonPage";
import ApplicationsPage from "./features/applications/ApplicationsPage";
import ProfilePage from "./features/profile/ProfilePage";
import AppShell from "./layout/AppShell";
import "./App.css";

function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="applications" element={<ApplicationsPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="dashboard" element={<ComingSoonPage title="Dashboard" description="See applications, conversations, interviews, and follow-ups that need attention." />} />
        <Route path="outreach" element={<ComingSoonPage title="Outreach" description="Manage referral requests and job-search conversations in one place." />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
