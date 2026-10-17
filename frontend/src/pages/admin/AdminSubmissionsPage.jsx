import { useEffect, useMemo, useState } from 'react'
import { api } from '../../api'
import Badge from '../../components/common/Badge'
import PageHeader from '../../components/common/PageHeader'

export default function AdminSubmissionsPage() {
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [verdictFilter, setVerdictFilter] = useState('all')

  async function loadSubmissions() {
    try {
      setLoading(true)
      const data = await api('/admin/submissions/?limit=300')
      setSubmissions(data)
    } catch (err) {
      setError(err.message || 'Failed to load submissions log')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSubmissions()
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return submissions.filter((s) => {
      if (verdictFilter === 'correct' && !s.is_correct) return false
      if (verdictFilter === 'incorrect' && s.is_correct) return false
      if (
        q &&
        !(s.username || '').toLowerCase().includes(q) &&
        !(s.challenge_name || '').toLowerCase().includes(q) &&
        !(s.submitted_flag || '').toLowerCase().includes(q)
      ) {
        return false
      }
      return true
    })
  }, [submissions, search, verdictFilter])

  if (loading) return <div className="card">Loading submissions log…</div>

  const headerActions = (
    <button type="button" className="secondary" onClick={loadSubmissions}>
      Refresh Log
    </button>
  )

  return (
    <div>
      <PageHeader
        title="Submissions &amp; Solve Verification"
        subtitle="Inspect incoming flag submissions, analyze cheating attempts, and verify solve validity."
        actions={headerActions}
      />

      {error && <div className="error" style={{ marginBottom: '1.25rem' }}>{error}</div>}

      {/* Filter and Search Bar */}
      <div className="admin-section">
        <div className="filter-bar">
          <div className="search-box">
            <input
              type="text"
              className="filter-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search username, challenge, or submitted string"
            />
          </div>

          <label className="muted" style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
            Verdict:
            <select
              className="filter-input"
              style={{ width: 'auto' }}
              value={verdictFilter}
              onChange={(e) => setVerdictFilter(e.target.value)}
            >
              <option value="all">All Submissions</option>
              <option value="correct">Correct Solves Only</option>
              <option value="incorrect">Incorrect Attempts Only</option>
            </select>
          </label>

          <div className="spacer" />
          <span className="muted" style={{ fontSize: '0.85rem' }}>
            Showing <strong>{filtered.length}</strong> of {submissions.length} submissions
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="admin-section">
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 60 }}>ID</th>
                <th>Participant</th>
                <th>Challenge</th>
                <th>Submitted String</th>
                <th>Verdict</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((sub) => (
                <tr key={sub.id}>
                  <td className="muted">#{sub.id}</td>
                  <td>
                    <strong style={{ color: '#fff' }}>{sub.username}</strong>
                  </td>
                  <td>{sub.challenge_name}</td>
                  <td>
                    <code
                      style={{
                        background: 'var(--bg-2)',
                        padding: '0.2rem 0.5rem',
                        borderRadius: 4,
                        fontSize: '0.85rem',
                        color: sub.is_correct ? 'var(--primary)' : 'var(--text-muted)',
                      }}
                    >
                      {sub.submitted_flag}
                    </code>
                  </td>
                  <td>
                    {sub.is_correct ? (
                      <Badge variant="success">Correct</Badge>
                    ) : (
                      <Badge variant="danger">Incorrect</Badge>
                    )}
                  </td>
                  <td className="muted" style={{ fontSize: '0.82rem' }}>
                    {new Date(sub.submitted_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
