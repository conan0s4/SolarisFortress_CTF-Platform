import { useEffect, useMemo, useState } from 'react'
import { api } from '../../api'
import { useAuth } from '../../context/AuthContext'
import Modal from '../../components/common/Modal'
import Badge from '../../components/common/Badge'
import PageHeader from '../../components/common/PageHeader'

export default function AdminPlayersPage() {
  const { user: currentUser } = useAuth()
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')

  // Details Modal
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [detailsModalOpen, setDetailsModalOpen] = useState(false)

  async function loadPlayers() {
    try {
      setLoading(true)
      const data = await api('/admin/players/')
      setPlayers(data)
    } catch (err) {
      setError(err.message || 'Failed to load players')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPlayers()
  }, [])

  async function toggleStatus(player) {
    try {
      setMessage('')
      setError('')
      const updated = await api(`/admin/players/${player.id}/`, {
        method: 'PATCH',
        body: { is_active: !player.is_active },
      })
      setMessage(`User ${updated.username} account ${updated.is_active ? 'enabled' : 'disabled'}.`)
      await loadPlayers()
    } catch (err) {
      setError(err.message || 'Failed to update account status')
    }
  }

  async function toggleStaff(player) {
    try {
      setMessage('')
      setError('')
      const updated = await api(`/admin/players/${player.id}/`, {
        method: 'PATCH',
        body: { is_staff: !player.is_staff },
      })
      setMessage(`User ${updated.username} role updated to ${updated.is_staff ? 'Administrator' : 'Participant'}.`)
      await loadPlayers()
    } catch (err) {
      setError(err.message || 'Failed to update user role')
    }
  }

  function viewDetails(player) {
    setSelectedPlayer(player)
    setDetailsModalOpen(true)
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return players.filter((p) => {
      if (roleFilter === 'staff' && !p.is_staff) return false
      if (roleFilter === 'player' && p.is_staff) return false
      if (q && !(p.username || '').toLowerCase().includes(q) && !(p.email || '').toLowerCase().includes(q)) {
        return false
      }
      return true
    })
  }, [players, search, roleFilter])

  if (loading) return <div className="card">Loading players directory…</div>

  return (
    <div>
      <PageHeader
        title="Players &amp; Account Roles"
        subtitle="Inspect participant solve histories, manage account activity, and promote or demote staff roles."
      />

      {message && <div className="success" style={{ marginBottom: '1.25rem' }}>{message}</div>}
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
              placeholder="Search username or email"
            />
          </div>

          <label className="muted" style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
            Role Filter:
            <select
              className="filter-input"
              style={{ width: 'auto' }}
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="all">All Roles</option>
              <option value="player">Participants Only</option>
              <option value="staff">Administrators Only</option>
            </select>
          </label>

          <div className="spacer" />
          <span className="muted" style={{ fontSize: '0.85rem' }}>
            {filtered.length} of {players.length} users
          </span>
        </div>
      </div>

      {/* Players Table */}
      <div className="admin-section">
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Solves</th>
                <th>Score</th>
                <th>Registered</th>
                <th className="actions-cell">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const totalScore = p.score?.total_score ?? 0
                const isSelf = currentUser && currentUser.id === p.id
                return (
                  <tr key={p.id}>
                    <td>
                      <strong style={{ color: '#fff' }}>{p.username}</strong>
                      {isSelf && (
                        <span style={{ marginLeft: '0.4rem' }}>
                          <Badge variant="accent">You</Badge>
                        </span>
                      )}
                    </td>
                    <td className="muted">{p.email || '—'}</td>
                    <td>
                      {p.is_superuser ? (
                        <Badge variant="accent">Superuser</Badge>
                      ) : p.is_staff ? (
                        <Badge variant="warning">Admin</Badge>
                      ) : (
                        <Badge variant="default">Player</Badge>
                      )}
                    </td>
                    <td>
                      {p.is_active ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="danger">Disabled</Badge>
                      )}
                    </td>
                    <td>{p.solve_count || 0}</td>
                    <td>
                      <strong style={{ color: 'var(--accent)' }}>{totalScore} pts</strong>
                    </td>
                    <td className="muted" style={{ fontSize: '0.82rem' }}>
                      {new Date(p.date_joined).toLocaleDateString()}
                    </td>
                    <td className="actions-cell">
                      <div className="action-group">
                        <button
                          type="button"
                          className="secondary icon-btn btn-text"
                          onClick={() => viewDetails(p)}
                        >
                          Details
                        </button>
                        <button
                          type="button"
                          className="secondary icon-btn btn-text"
                          onClick={() => toggleStaff(p)}
                          disabled={isSelf && p.is_staff}
                          title={
                            isSelf && p.is_staff
                              ? 'You cannot remove your own administrative role'
                              : 'Toggle Staff role'
                          }
                        >
                          {p.is_staff ? 'Demote' : 'Make Admin'}
                        </button>
                        <button
                          type="button"
                          className={
                            p.is_active
                              ? 'danger-button icon-btn btn-text danger'
                              : 'secondary icon-btn btn-text'
                          }
                          onClick={() => toggleStatus(p)}
                          disabled={isSelf && p.is_active}
                          title={
                            isSelf && p.is_active
                              ? 'You cannot disable your own account'
                              : 'Toggle Account Active Status'
                          }
                        >
                          {p.is_active ? 'Disable' : 'Enable'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Player Details Modal */}
      <Modal
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        title={'Player Profile: ' + (selectedPlayer?.username || '')}
        maxWidth={620}
      >
        {selectedPlayer && (
          <div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.75rem',
                marginBottom: '1.25rem',
              }}
            >
              <div
                style={{
                  background: 'var(--bg-2)',
                  padding: '0.75rem',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                }}
              >
                <span className="profile-label">Total Authoritative Score</span>
                <strong style={{ fontSize: '1.3rem', color: 'var(--accent)' }}>
                  {selectedPlayer.score?.total_score ?? 0} pts
                </strong>
                <div className="muted" style={{ fontSize: '0.75rem' }}>
                  Solve points: {selectedPlayer.score?.solve_points ?? 0} | Adjustments: {selectedPlayer.score?.adjustment_points ?? 0}
                </div>
              </div>

              <div
                style={{
                  background: 'var(--bg-2)',
                  padding: '0.75rem',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                }}
              >
                <span className="profile-label">Solves Completed</span>
                <strong style={{ fontSize: '1.3rem', color: 'var(--primary)' }}>
                  {selectedPlayer.solve_count ?? 0}
                </strong>
                <div className="muted" style={{ fontSize: '0.75rem' }}>
                  Registered {new Date(selectedPlayer.date_joined).toLocaleDateString()}
                </div>
              </div>
            </div>

            {/* Solves List */}
            <h3
              style={{
                fontSize: '1rem',
                color: 'var(--primary)',
                marginBottom: '0.5rem',
              }}
            >
              Captured Flags ({selectedPlayer.solves?.length || 0})
            </h3>
            {selectedPlayer.solves && selectedPlayer.solves.length > 0 ? (
              <div
                style={{
                  maxHeight: 200,
                  overflowY: 'auto',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  marginBottom: '1.25rem',
                }}
              >
                <table className="data-table" style={{ fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      <th>Challenge</th>
                      <th>Points</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPlayer.solves.map((s) => (
                      <tr key={s.id}>
                        <td>{s.challenge_name}</td>
                        <td style={{ color: 'var(--accent)', fontWeight: 600 }}>+{s.points}</td>
                        <td className="muted">{new Date(s.solved_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="muted" style={{ fontSize: '0.88rem' }}>
                No challenge solves yet.
              </p>
            )}

            {/* Manual Adjustments List */}
            <h3
              style={{
                fontSize: '1rem',
                color: 'var(--primary)',
                marginBottom: '0.5rem',
              }}
            >
              Manual Score Adjustments ({selectedPlayer.adjustments?.length || 0})
            </h3>
            {selectedPlayer.adjustments && selectedPlayer.adjustments.length > 0 ? (
              <div
                style={{
                  maxHeight: 160,
                  overflowY: 'auto',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                }}
              >
                <table className="data-table" style={{ fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      <th>Delta</th>
                      <th>Reason</th>
                      <th>By</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPlayer.adjustments.map((a) => (
                      <tr key={a.id}>
                        <td
                          style={{
                            color: a.points > 0 ? 'var(--success)' : 'var(--danger)',
                            fontWeight: 700,
                          }}
                        >
                          {a.points > 0 ? `+${a.points}` : a.points}
                        </td>
                        <td>{a.reason}</td>
                        <td className="muted">{a.created_by}</td>
                        <td>
                          {a.is_reversed ? (
                            <Badge variant="warning">Reversed</Badge>
                          ) : (
                            <Badge variant="success">Applied</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="muted" style={{ fontSize: '0.88rem' }}>
                No manual adjustments recorded.
              </p>
            )}

            <div className="modal-actions" style={{ marginTop: '1.25rem' }}>
              <button type="button" onClick={() => setDetailsModalOpen(false)}>
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
