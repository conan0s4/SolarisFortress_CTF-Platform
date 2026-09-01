import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'

export default function ChallengesPage() {
  const [challenges, setChallenges] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterText, setFilterText] = useState('')
  const [filterCategory, setFilterCategory] = useState('All')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await api('/challenges/')
        if (!cancelled) setChallenges(data)
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load challenges')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const categories = useMemo(() => {
    const set = new Set(challenges.map((c) => c.category))
    return ['All', ...Array.from(set).sort()]
  }, [challenges])

  const visible = useMemo(() => {
    const q = filterText.trim().toLowerCase()
    return challenges.filter((c) => {
      if (filterCategory !== 'All' && c.category !== filterCategory) return false
      if (q && !c.name.toLowerCase().includes(q)) return false
      return true
    })
  }, [challenges, filterText, filterCategory])

  if (loading) return <div className="card">Loading challenges…</div>

  return (
    <div>
      <h1>Challenges</h1>
      {error && <div className="error">{error}</div>}

      <div className="card">
        <div className="row">
          <label className="muted" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            Search:
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="challenge name…"
              style={{
                background: 'var(--bg-2)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                padding: '0.4rem 0.6rem',
                borderRadius: 6,
              }}
            />
          </label>
          <label className="muted" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            Category:
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              style={{
                background: 'var(--bg-2)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                padding: '0.4rem 0.6rem',
                borderRadius: 6,
              }}
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </label>
          <div className="spacer" />
          <span className="muted">{visible.length} of {challenges.length} shown</span>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="card">
          <p className="muted">No challenges match your filters yet.</p>
        </div>
      ) : (
        <div className="challenge-grid" style={{ marginTop: '1rem' }}>
          {visible.map((c) => (
            <Link key={c.id} to={`/challenges/${c.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
              <div className="challenge-card">
                <div className="row">
                  <span className="category">{c.category}</span>
                  <span className="points">{c.points}</span>
                </div>
                <div className="name">{c.name}</div>
                <div className="row">
                  {c.solved ? (
                    <span className="badge solved">Solved</span>
                  ) : (
                    <span className="badge">Open</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}