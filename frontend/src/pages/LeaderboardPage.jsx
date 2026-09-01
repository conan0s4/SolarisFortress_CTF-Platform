import { useEffect, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../context/AuthContext.jsx'

export default function LeaderboardPage() {
  const { user } = useAuth()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await api('/leaderboard/')
        if (!cancelled) setEntries(data)
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load leaderboard')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  if (loading) return <div className="card">Loading leaderboard…</div>

  return (
    <div>
      <h1>Leaderboard</h1>
      {error && <div className="error">{error}</div>}

      <div className="card">
        {entries.length === 0 ? (
          <p className="muted">No solves yet. Be the first to capture a flag!</p>
        ) : (
          <table className="leaderboard">
            <thead>
              <tr>
                <th>Rank</th>
                <th>User</th>
                <th>Solves</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.user_id} className={user && user.id === e.user_id ? 'me' : ''}>
                  <td>{e.rank}</td>
                  <td>{e.username}</td>
                  <td>{e.solves}</td>
                  <td><strong style={{ color: 'var(--accent)' }}>{e.score}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}