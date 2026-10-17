import { useState } from 'react'
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function AdminLayout() {
  const { user } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  function closeMobile() {
    setMobileOpen(false)
  }

  return (
    <div className="admin-layout">
      {/* Mobile Drawer Backdrop */}
      <div
        className={`admin-mobile-backdrop ${mobileOpen ? 'open' : ''}`}
        onClick={closeMobile}
      />

      {/* Sidebar */}
      <aside className={`admin-sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="sidebar-brand-badge">ADMINISTRATION</div>
          <div className="sidebar-brand-title">Admin Console</div>
          <div className="sidebar-brand-sub">Signed in as <strong>{user?.username}</strong></div>
        </div>

        {/* Section: Platform Config */}
        <div className="sidebar-header" role="presentation">
          <span className="sidebar-header-line" />
          <span className="sidebar-header-text">Platform Config</span>
          <span className="sidebar-header-line" />
        </div>
        <nav className="sidebar-nav-group" aria-label="Platform Configuration">
          <NavLink to="/admin" end className={({ isActive }) => (isActive ? 'active' : '')} onClick={closeMobile}>
            <span className="nav-label">Overview</span>
            <span className="nav-arrow">›</span>
          </NavLink>
          <NavLink to="/admin/competition" className={({ isActive }) => (isActive ? 'active' : '')} onClick={closeMobile}>
            <span className="nav-label">Competition</span>
            <span className="nav-arrow">›</span>
          </NavLink>
          <NavLink to="/admin/announcements" className={({ isActive }) => (isActive ? 'active' : '')} onClick={closeMobile}>
            <span className="nav-label">Announcements</span>
            <span className="nav-arrow">›</span>
          </NavLink>
        </nav>

        {/* Section: Challenges & Scoring */}
        <div className="sidebar-header" role="presentation">
          <span className="sidebar-header-line" />
          <span className="sidebar-header-text">Challenges &amp; Scoring</span>
          <span className="sidebar-header-line" />
        </div>
        <nav className="sidebar-nav-group" aria-label="Challenges and Scoring">
          <NavLink to="/admin/challenges" className={({ isActive }) => (isActive ? 'active' : '')} onClick={closeMobile}>
            <span className="nav-label">Challenges</span>
            <span className="nav-arrow">›</span>
          </NavLink>
          <NavLink to="/admin/submissions" className={({ isActive }) => (isActive ? 'active' : '')} onClick={closeMobile}>
            <span className="nav-label">Submissions</span>
            <span className="nav-arrow">›</span>
          </NavLink>
          <NavLink
            to="/admin/score-adjustments"
            className={({ isActive }) => (isActive ? 'active' : '')}
            onClick={closeMobile}
          >
            <span className="nav-label">Score Adjustments</span>
            <span className="nav-arrow">›</span>
          </NavLink>
        </nav>

        {/* Section: Users & Security */}
        <div className="sidebar-header" role="presentation">
          <span className="sidebar-header-line" />
          <span className="sidebar-header-text">Users &amp; Security</span>
          <span className="sidebar-header-line" />
        </div>
        <nav className="sidebar-nav-group" aria-label="Users and Security">
          <NavLink to="/admin/players" className={({ isActive }) => (isActive ? 'active' : '')} onClick={closeMobile}>
            <span className="nav-label">Players &amp; Roles</span>
            <span className="nav-arrow">›</span>
          </NavLink>
          <NavLink to="/admin/audit-logs" className={({ isActive }) => (isActive ? 'active' : '')} onClick={closeMobile}>
            <span className="nav-label">Audit Logs</span>
            <span className="nav-arrow">›</span>
          </NavLink>
          <NavLink to="/admin/export" className={({ isActive }) => (isActive ? 'active' : '')} onClick={closeMobile}>
            <span className="nav-label">Data Export</span>
            <span className="nav-arrow">›</span>
          </NavLink>
        </nav>

        {/* Sidebar Footer: Exit / Redirect to Public Platform */}
        <div className="sidebar-footer">
          <div className="sidebar-footer-title">Platform Redirect</div>
          <Link
            to="/"
            className="sidebar-exit-card"
            onClick={closeMobile}
            title="Leave Admin and return to Public CTF platform"
          >
            <span className="sidebar-exit-icon">←</span>
            <div className="sidebar-exit-details">
              <span className="sidebar-exit-heading">Return to Public CTF</span>
              <span className="sidebar-exit-caption">Exit Admin Console</span>
            </div>
            <span className="sidebar-exit-tag">Exit</span>
          </Link>
        </div>
      </aside>

      {/* Main Admin View Content */}
      <main className="admin-content">
        <button
          type="button"
          className="admin-mobile-nav-toggle"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle admin navigation menu"
        >
          <span>☰ Admin Navigation Menu</span>
          <span>{mobileOpen ? '✕ Close' : '▾ Menu'}</span>
        </button>
        <Outlet />
      </main>
    </div>
  )
}
