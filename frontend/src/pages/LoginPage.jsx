import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [started, setStarted] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function handlePlay() {
    setStarted(true)
  }

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      await login(username, password)

      const to =
        location.state && location.state.from
          ? location.state.from
          : '/'

      navigate(to, { replace: true })
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={`auth-page ${started ? 'login-started' : ''}`}>

      {/* Initial Play Screen */}
      {!started && (
        <div className="start-screen">
          <div className="start-content">

            <div className="game-title">
              <div className="game-title-main">
                SOLARISFORTRESS
              </div>

              <div className="game-title-sub">
                CTF PLATFORM
              </div>
            </div>

            <div className="terminal-line">
              <span>&gt;</span> SYSTEM READY_
            </div>

            <button
              type="button"
              className="play-button"
              onClick={handlePlay}
            >
              <span className="play-icon">▶</span>
              <span>PLAY</span>
            </button>

            <div className="start-hint">
              PRESS TO BEGIN
            </div>

          </div>
        </div>
      )}

      {/* Login Screen */}
      {started && (
        <div className="login-screen">

          <div className="login-logo">
            <div className="login-logo-main">
              SOLARISFORTRESS
            </div>
            <div className="login-logo-sub">
              CTF PLATFORM
            </div>
          </div>

          <div className="card login-card">

            <div className="login-header">
              <div className="login-terminal">
                &gt; ACCESS TERMINAL
              </div>

              <h2>Sign in</h2>

              <p className="muted">
                Welcome back to SolarisFortress CTF.
              </p>
            </div>

            <form className="form" onSubmit={onSubmit}>

              {error && (
                <div className="error">
                  {error}
                </div>
              )}

              <label>
                Username

                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoFocus
                  autoComplete="username"
                  required
                />
              </label>

              <label>
                Password

                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </label>

              <button
                type="submit"
                disabled={submitting}
                className="login-button"
              >
                {submitting ? 'Signing in…' : 'Login'}
              </button>

            </form>

            <p
              className="muted register-link"
            >
              No account? <Link to="/register">Register</Link>
            </p>

          </div>

          <div className="login-footer">
            SECURE CONNECTION ESTABLISHED
          </div>

        </div>
      )}

    </div>
  )
}