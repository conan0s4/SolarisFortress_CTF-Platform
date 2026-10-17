import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'

export default function DashboardPage() {
  const [progress, setProgress] = useState(null)
  const [challenges, setChallenges] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [p, cs, ann] = await Promise.all([
          api('/progress/'),
          api('/challenges/'),
          api('/announcements/'),
        ])
        if (!cancelled) {
          setProgress(p)
          setChallenges(cs)
          setAnnouncements(Array.isArray(ann) ? ann.filter((a) => a.is_pinned) : [])
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load dashboard')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  if (loading) return <div className="card">Loading dashboard…</div>

  const solvedSet = new Set((progress?.solved_challenge_ids) || [])
  const solvedCount = solvedSet.size
  const total = challenges.length

  const pinned = announcements.filter((a) => a.is_pinned)

  return (
    <div>
      <h1>Dashboard</h1>
      {error && <div className="error">{error}</div>}

      {pinned.length > 0 && (
        <div className="card">
          <h2>Announcements</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {pinned.map((a) => (
              <div key={a.id} style={{ borderLeft: '3px solid var(--accent)', paddingLeft: '0.75rem' }}>
                <strong style={{ color: '#fff' }}>{a.title}</strong>
                <p style={{ margin: '0.25rem 0', color: 'var(--muted)', fontSize: '0.92rem' }}>{a.content}</p>
                <span className="muted" style={{ fontSize: '0.75rem' }}>
                  Posted {new Date(a.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <h2>Your progress</h2>
        <dl className="kv">
          <dt>Score</dt>
          <dd><strong style={{ color: 'var(--accent)' }}>{progress?.score ?? 0}</strong> points</dd>
          <dt>Challenges solved</dt>
          <dd>{solvedCount} / {total}</dd>
        </dl>
        <div className="row">
          <Link to="/challenges"><button>View challenges</button></Link>
          <Link to="/leaderboard"><button className="secondary">Leaderboard</button></Link>
        </div>
      </div>

      <div className="card">
        <h2>Welcome</h2>
        <p className="muted">
          Browse the available challenges, download any attached files, and submit your flags.
          Points are awarded once per challenge. Good luck!
        </p>
      </div>
    </div>
  )
}
