import { Navigate, Outlet, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function AdminRoute() {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="card" style={{ margin: '2rem auto', maxWidth: 400, textAlign: 'center' }}>Authenticating…</div>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!user.is_staff) {
    return (
      <div className="card error" style={{ margin: '2rem auto', maxWidth: 600, textAlign: 'center' }}>
        <h2>Access Denied</h2>
        <p>You do not have administrative privileges to access this area.</p>
        <div style={{ marginTop: '1rem' }}>
          <Link to="/" className="btn secondary">
            &larr; Return to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return <Outlet />
}
