import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api'
import StatCard from '../../components/common/StatCard'
import Badge from '../../components/common/Badge'
import PageHeader from '../../components/common/PageHeader'

export default function AdminOverviewPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  async function loadData() {
    try {
      setLoading(true)
      const res = await api('/admin/overview/')
      setData(res)
    } catch (err) {
      setError(err.message || 'Failed to load admin overview')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  async function handleToggleFreeze() {
    if (!data?.competition) return
    const newState = !data.competition.scoreboard_frozen
    setActionLoading(true)
    try {
      await api('/admin/competition/', {
        method: 'PUT',
        body: { scoreboard_frozen: newState },
      })
      await loadData()
    } catch (err) {
      setError(err.message || 'Failed to update scoreboard state')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) return <div className="card">Loading administrative overview…</div>
  if (!data && error) {
    return (
      <div className="card error" style={{ textAlign: 'center', padding: '2rem' }}>
        <h2>Failed to Load Overview</h2>
        <p>{error}</p>
        <button type="button" onClick={loadData} style={{ marginTop: '1rem' }}>
          Retry Loading
        </button>
      </div>
    )
  }
  if (!data) return null

  const m = data.metrics || {}
  const comp = data.competition || {}

  const headerActions = (
    <>
      <button
        type="button"
        className={comp.scoreboard_frozen ? 'warn-btn' : 'secondary'}
        onClick={handleToggleFreeze}
        disabled={actionLoading}
      >
        {comp.scoreboard_frozen ? 'Scoreboard Frozen (Click to Unfreeze)' : 'Freeze Scoreboard'}
      </button>
      <Link to="/admin/challenges">
        <button type="button">+ Create Challenge</button>
      </Link>
    </>
  )

  return (
    <div>
      <PageHeader
        title="Platform Operations Overview"
        subtitle="Real-time status of SolarisFortress CTF competition, participants, and scoring."
        actions={headerActions}
      />

      {error && (
        <div className="error" style={{ marginBottom: '1.25rem' }}>
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="stats-grid">
        <StatCard
          label="Total Players"
          value={m.total_players}
          sub={`${m.total_staff} admins / organizers`}
          variant="primary"
        />
        <StatCard
          label="Challenges Active"
          value={`${m.published_challenges} / ${m.total_challenges}`}
          sub={`${m.archived_challenges} archived`}
          variant="accent"
        />
        <StatCard
          label="Flag Submissions"
          value={m.total_submissions}
          sub={`${m.correct_solves} successful solves`}
        />
        <StatCard
          label="Platform Status"
          value={comp.is_active ? 'ACTIVE' : 'PAUSED'}
          sub={comp.registration_open ? 'Registrations open' : 'Registrations closed'}
          variant={comp.is_active ? 'primary' : 'default'}
        />
      </div>

      {/* Grid: Recent Submissions & Recent Audit Trail */}
      <div
        className="admin-section"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))',
          gap: '1.5rem',
        }}
      >
        {/* Recent Submissions */}
        <div className="card">
          <div className="admin-section-title">
            <h2 className="card-title">Recent Submissions</h2>
            <Link to="/admin/submissions" style={{ fontSize: '0.85rem' }}>
              View all &rarr;
            </Link>
          </div>

          {data.recent_submissions && data.recent_submissions.length > 0 ? (
            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Challenge</th>
                    <th>Verdict</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent_submissions.map((sub) => (
                    <tr key={sub.id}>
                      <td style={{ fontWeight: 600, color: '#fff' }}>{sub.username}</td>
                      <td>{sub.challenge_name}</td>
                      <td>
                        {sub.is_correct ? (
                          <Badge variant="success">Correct</Badge>
                        ) : (
                          <Badge variant="danger">Incorrect</Badge>
                        )}
                      </td>
                      <td className="muted" style={{ fontSize: '0.8rem' }}>
                        {new Date(sub.submitted_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="muted">No submissions recorded yet.</p>
          )}
        </div>

        {/* Recent Audit Logs */}
        <div className="card">
          <div className="admin-section-title">
            <h2 className="card-title">Security &amp; Audit Activity</h2>
            <Link to="/admin/audit-logs" style={{ fontSize: '0.85rem' }}>
              View all &rarr;
            </Link>
          </div>

          {data.recent_audit_logs && data.recent_audit_logs.length > 0 ? (
            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Actor</th>
                    <th>Action</th>
                    <th>Target</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent_audit_logs.map((log) => (
                    <tr key={log.id}>
                      <td style={{ fontWeight: 600, color: 'var(--accent)' }}>
                        {log.actor_username}
                      </td>
                      <td>
                        <span style={{ fontSize: '0.82rem', fontFamily: 'monospace' }}>
                          {log.action}
                        </span>
                      </td>
                      <td
                        style={{
                          maxWidth: 180,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {log.target_repr || log.target_type}
                      </td>
                      <td className="muted" style={{ fontSize: '0.8rem' }}>
                        {new Date(log.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="muted">No audit logs generated yet.</p>
          )}
        </div>
      </div>
    </div>
  )
}
