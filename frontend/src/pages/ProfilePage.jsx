import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../context/AuthContext.jsx'

export default function ProfilePage() {
  const { user, logout } = useAuth()

  const [progress, setProgress] = useState(null)
  const [challenges, setChallenges] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState('')
  const [passwordError, setPasswordError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadProfile() {
      try {
        setLoading(true)
        setError('')

        const [progressData, challengeData] = await Promise.all([
          api('/progress/'),
          api('/challenges/'),
        ])

        if (!cancelled) {
          setProgress(progressData)
          setChallenges(Array.isArray(challengeData) ? challengeData : [])
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load profile')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadProfile()

    return () => {
      cancelled = true
    }
  }, [])

  const solvedIds = useMemo(
    () => new Set(progress?.solved_challenge_ids || []),
    [progress]
  )

  const solvedChallenges = useMemo(
    () => challenges.filter((challenge) => solvedIds.has(challenge.id)),
    [challenges, solvedIds]
  )

  const solvedCount = solvedIds.size
  const totalChallenges = challenges.length
  const score = progress?.score ?? 0

  const progressPercent =
    totalChallenges > 0
      ? Math.round((solvedCount / totalChallenges) * 100)
      : 0

  async function handlePasswordChange(event) {
    event.preventDefault()

    setPasswordMessage('')
    setPasswordError('')

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Please fill in all password fields.')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.')
      return
    }

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.')
      return
    }

    try {
      setPasswordLoading(true)

      await api('/auth/password/', {
        method: 'POST',
        body: {
          current_password: currentPassword,
          new_password: newPassword,
          password_confirm: confirmPassword,
        },
      })

      setPasswordMessage('Password changed successfully.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setPasswordError(err.message || 'Failed to change password.')
    } finally {
      setPasswordLoading(false)
    }
  }

  async function handleLogout() {
    await logout()
  }

  if (loading) {
    return (
      <div className="card">
        <p className="muted">Loading profile…</p>
      </div>
    )
  }

  return (
    <div className="profile-page">
      <div className="profile-header">
        <div>
          <h1>Profile</h1>
          <p className="muted">
            Your SolarisFortress account and CTF progress.
          </p>
        </div>

        <Link to="/challenges">
          <button>Browse Challenges</button>
        </Link>
      </div>

      {error && <div className="error profile-message">{error}</div>}

      <div className="profile-grid">
        <section className="card profile-card">
          <div className="profile-avatar">
            {(user?.username || '?').charAt(0).toUpperCase()}
          </div>

          <div className="profile-identity">
            <h2>{user?.username || 'Unknown User'}</h2>
            <span className="badge">CTF Participant</span>
          </div>

          <div className="profile-details">
            <div>
              <span className="profile-label">Username</span>
              <strong>{user?.username || '—'}</strong>
            </div>

            {user?.email && (
              <div>
                <span className="profile-label">Email</span>
                <strong>{user.email}</strong>
              </div>
            )}
          </div>
        </section>

        <section className="card">
          <h2>CTF Statistics</h2>

          <div className="stats-grid">
            <div className="stat">
              <span className="stat-label">Score</span>
              <strong className="stat-value accent-value">{score}</strong>
              <span className="stat-description">points</span>
            </div>

            <div className="stat">
              <span className="stat-label">Solved</span>
              <strong className="stat-value">{solvedCount}</strong>
              <span className="stat-description">
                of {totalChallenges} challenges
              </span>
            </div>

            <div className="stat">
              <span className="stat-label">Completion</span>
              <strong className="stat-value">{progressPercent}%</strong>
              <span className="stat-description">overall progress</span>
            </div>
          </div>

          <div className="progress-section">
            <div className="progress-header">
              <span>Challenge progress</span>
              <strong>{progressPercent}%</strong>
            </div>

            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </section>
      </div>

      <section className="card solved-section">
        <div className="section-header">
          <div>
            <h2>Solved Challenges</h2>
            <p className="muted">
              Challenges you have successfully completed.
            </p>
          </div>

          <span className="count-badge">
            {solvedCount} solved
          </span>
        </div>

        {solvedChallenges.length === 0 ? (
          <div className="empty-state">
            <p>No challenges solved yet.</p>
            <Link to="/challenges">
              <button>Find a Challenge</button>
            </Link>
          </div>
        ) : (
          <div className="solved-list">
            {solvedChallenges.map((challenge) => (
              <Link
                key={challenge.id}
                to={`/challenges/${challenge.id}`}
                className="solved-challenge"
              >
                <div>
                  <span className="challenge-category">
                    {challenge.category || 'Challenge'}
                  </span>

                  <strong>
                    {challenge.name || challenge.title}
                  </strong>
                </div>

                <div className="solved-points">
                  +{challenge.points ?? 0}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="card account-section">
        <div className="section-header">
          <div>
            <h2>Account</h2>
            <p className="muted">
              Manage your account settings.
            </p>
          </div>
        </div>

        <div className="account-actions">
          <button
            className="secondary"
            onClick={() => {
              setShowPasswordForm((value) => !value)
              setPasswordMessage('')
              setPasswordError('')
            }}
          >
            {showPasswordForm ? 'Cancel Password Change' : 'Change Password'}
          </button>

          <button
            className="danger-button"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>

        {showPasswordForm && (
          <form
            className="form password-form"
            onSubmit={handlePasswordChange}
          >
            <h3>Change Password</h3>

            {passwordError && (
              <div className="error">{passwordError}</div>
            )}

            {passwordMessage && (
              <div className="success">{passwordMessage}</div>
            )}

            <label>
              Current password
              <input
                type="password"
                value={currentPassword}
                onChange={(event) =>
                  setCurrentPassword(event.target.value)
                }
                autoComplete="current-password"
                disabled={passwordLoading}
              />
            </label>

            <label>
              New password
              <input
                type="password"
                value={newPassword}
                onChange={(event) =>
                  setNewPassword(event.target.value)
                }
                autoComplete="new-password"
                disabled={passwordLoading}
              />
            </label>

            <label>
              Confirm new password
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(event.target.value)
                }
                autoComplete="new-password"
                disabled={passwordLoading}
              />
            </label>

            <button type="submit" disabled={passwordLoading}>
              {passwordLoading ? 'Changing password…' : 'Change Password'}
            </button>
          </form>
        )}
      </section>
    </div>
  )
}
