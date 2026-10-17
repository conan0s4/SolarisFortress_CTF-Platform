import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'

// Public Pages
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import ChallengesPage from './pages/ChallengesPage'
import ChallengeDetailPage from './pages/ChallengeDetailPage'
import LeaderboardPage from './pages/LeaderboardPage'
import ProfilePage from './pages/ProfilePage'

// Admin Pages
import AdminLayout from './pages/admin/AdminLayout'
import AdminOverviewPage from './pages/admin/AdminOverviewPage'
import AdminCompetitionPage from './pages/admin/AdminCompetitionPage'
import AdminChallengesPage from './pages/admin/AdminChallengesPage'
import AdminPlayersPage from './pages/admin/AdminPlayersPage'
import AdminSubmissionsPage from './pages/admin/AdminSubmissionsPage'
import AdminScoreAdjustmentsPage from './pages/admin/AdminScoreAdjustmentsPage'
import AdminAuditLogsPage from './pages/admin/AdminAuditLogsPage'
import AdminAnnouncementsPage from './pages/admin/AdminAnnouncementsPage'
import AdminExportPage from './pages/admin/AdminExportPage'

function PublicLayout() {
  return (
    <div className="container">
      <Outlet />
    </div>
  )
}

export default function App() {
  return (
    <div className="app">
      <Navbar />
      <Routes>
        {/* Auth Pages */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected Participant Routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<PublicLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/challenges" element={<ChallengesPage />} />
            <Route path="/challenges/:id" element={<ChallengeDetailPage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>
        </Route>

        {/* Protected Staff / Admin Routes */}
        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminOverviewPage />} />
            <Route path="competition" element={<AdminCompetitionPage />} />
            <Route path="challenges" element={<AdminChallengesPage />} />
            <Route path="players" element={<AdminPlayersPage />} />
            <Route path="submissions" element={<AdminSubmissionsPage />} />
            <Route path="score-adjustments" element={<AdminScoreAdjustmentsPage />} />
            <Route path="audit-logs" element={<AdminAuditLogsPage />} />
            <Route path="announcements" element={<AdminAnnouncementsPage />} />
            <Route path="export" element={<AdminExportPage />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}