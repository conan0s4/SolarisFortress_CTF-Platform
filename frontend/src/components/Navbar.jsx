import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="navbar">
      <div className="brand">
        SolarisFortress <span className="sub">CTF</span>
      </div>
      {user ? (
        <>
          <nav>
            <NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''}>
              Dashboard
            </NavLink>
            <NavLink to="/challenges" className={({ isActive }) => isActive ? 'active' : ''}>
              Challenges
            </NavLink>
            <NavLink to="/leaderboard" className={({ isActive }) => isActive ? 'active' : ''}>
              Leaderboard
            </NavLink>
            <NavLink to="/profile" className={({ isActive }) => isActive ? 'active' : ''}>
              Profile
            </NavLink>
          </nav>
          <div className="spacer" />
          <span className="user">
            Signed in as <strong>{user.username}</strong>
            {user.is_staff ? ' (admin)' : ''}
          </span>
          <button className="linkish" onClick={handleLogout}>Logout</button>
        </>
      ) : (
        <>
          <div className="spacer" />
          <NavLink to="/login">Login</NavLink>
          <NavLink to="/register">Register</NavLink>
        </>
      )}
    </header>
  )
}