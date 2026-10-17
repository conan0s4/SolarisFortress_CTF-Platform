import { useEffect, useState } from 'react'
import { api } from '../../api'
import Modal from '../../components/common/Modal'
import ConfirmModal from '../../components/common/ConfirmModal'
import Badge from '../../components/common/Badge'
import PageHeader from '../../components/common/PageHeader'

export default function AdminScoreAdjustmentsPage() {
  const [adjustments, setAdjustments] = useState([])
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  // New adjustment modal state
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [pointsDelta, setPointsDelta] = useState(50)
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [createError, setCreateError] = useState('')

  // Reverse modal state
  const [reverseModalOpen, setReverseModalOpen] = useState(false)
  const [adjustmentToReverse, setAdjustmentToReverse] = useState(null)
  const [reversalReason, setReversalReason] = useState('Administrative correction')
  const [reversing, setReversing] = useState(false)
  const [reverseError, setReverseError] = useState('')

  async function loadData() {
    try {
      setLoading(true)
      const [adjData, playerData] = await Promise.all([
        api('/admin/score-adjustments/'),
        api('/admin/players/'),
      ])
      setAdjustments(adjData)
      setPlayers(playerData)
      if (playerData.length > 0 && !selectedUserId) {
        setSelectedUserId(playerData[0].id)
      }
    } catch (err) {
      setError(err.message || 'Failed to load score adjustments')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function openCreateModal() {
    setCreateError('')
    if (players.length > 0 && !selectedUserId) {
      setSelectedUserId(players[0].id)
    }
    setCreateModalOpen(true)
  }

  async function handleCreateAdjustment(e) {
    e.preventDefault()
    setCreateError('')
    if (!selectedUserId || !reason.trim()) {
      setCreateError('Player and mandatory explanation reason are required.')
      return
    }

    setSubmitting(true)
    setMessage('')
    setError('')
    try {
      const res = await api('/admin/score-adjustments/', {
        method: 'POST',
        body: {
          user_id: selectedUserId,
          points: pointsDelta,
          reason: reason.trim(),
        },
      })
      setMessage(`Adjustment of ${res.points > 0 ? '+' : ''}${res.points} pts for ${res.username} recorded in ledger.`)
      setCreateModalOpen(false)
      setReason('')
      await loadData()
    } catch (err) {
      setCreateError(err.message || 'Failed to create score adjustment')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleConfirmReversal() {
    if (!adjustmentToReverse) return
    setReversing(true)
    setReverseError('')
    setMessage('')
    setError('')
    try {
      await api(`/admin/score-adjustments/${adjustmentToReverse.id}/reverse/`, {
        method: 'POST',
        body: { reversal_reason: reversalReason.trim() },
      })
      setMessage(`Adjustment #${adjustmentToReverse.id} reversed successfully. Scores recalculated.`)
      setReverseModalOpen(false)
      setAdjustmentToReverse(null)
      await loadData()
    } catch (err) {
      setReverseError(err.message || 'Failed to reverse adjustment')
    } finally {
      setReversing(false)
    }
  }

  if (loading) return <div className="card">Loading score adjustments ledger…</div>

  const headerActions = (
    <button type="button" onClick={openCreateModal}>
      + Issue Score Adjustment
    </button>
  )

  return (
    <div>
      <PageHeader
        title="Manual Score Adjustments Ledger"
        subtitle="Audit-backed point awards and deductions (e.g. bonus questions, rule infraction penalties)."
        actions={headerActions}
      />

      {message && <div className="success" style={{ marginBottom: '1.25rem' }}>{message}</div>}
      {error && <div className="error" style={{ marginBottom: '1.25rem' }}>{error}</div>}

      <div className="admin-section">
        {adjustments.length === 0 ? (
          <p className="muted" style={{ margin: '1rem 0' }}>
            No manual score adjustments issued yet. Normal challenge solves update scores automatically.
          </p>
        ) : (
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 60 }}>ID</th>
                  <th>Target Player</th>
                  <th>Point Delta</th>
                  <th>Mandatory Reason</th>
                  <th>Issued By</th>
                  <th>Timestamp</th>
                  <th>Status</th>
                  <th className="actions-cell">Actions</th>
                </tr>
              </thead>
              <tbody>
                {adjustments.map((a) => (
                  <tr key={a.id}>
                    <td className="muted">#{a.id}</td>
                    <td>
                      <strong style={{ color: '#fff' }}>{a.username}</strong>
                    </td>
                    <td>
                      <strong
                        style={{
                          color: a.points > 0 ? 'var(--success)' : 'var(--danger)',
                          fontSize: '1.05rem',
                        }}
                      >
                        {a.points > 0 ? `+${a.points}` : a.points} pts
                      </strong>
                    </td>
                    <td style={{ maxWidth: 300 }}>{a.reason}</td>
                    <td className="muted">{a.created_by_name || 'System'}</td>
                    <td className="muted" style={{ fontSize: '0.82rem' }}>
                      {new Date(a.created_at).toLocaleString()}
                    </td>
                    <td>
                      {a.is_reversed ? (
                        <div>
                          <Badge variant="warning">Reversed</Badge>
                          <div className="muted" style={{ fontSize: '0.72rem', marginTop: 2 }}>
                            by {a.reversed_by_name}
                          </div>
                        </div>
                      ) : (
                        <Badge variant="success">Active</Badge>
                      )}
                    </td>
                    <td className="actions-cell">
                      {!a.is_reversed && (
                        <button
                          type="button"
                          className="danger-button icon-btn btn-text danger"
                          onClick={() => {
                            setAdjustmentToReverse(a)
                            setReversalReason('Administrative reversal')
                            setReverseModalOpen(true)
                          }}
                        >
                          Reverse
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Issue Adjustment Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Issue Manual Score Adjustment"
        maxWidth={520}
      >
        <form onSubmit={handleCreateAdjustment} className="form">
          {createError && (
            <div className="error" style={{ marginBottom: '1rem' }}>
              {createError}
            </div>
          )}
          <label>
            Target Player
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              required
            >
              <option value="" disabled>-- Select a participant --</option>
              {players.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.username} (Current Score: {p.score?.total_score ?? 0} pts)
                </option>
              ))}
            </select>
          </label>

          <label>
            Point Delta (Use negative numbers for penalties)
            <input
              type="number"
              value={pointsDelta}
              onChange={(e) => setPointsDelta(Number(e.target.value))}
              placeholder="e.g. 50 or -25"
              required
            />
            <span className="muted" style={{ fontSize: '0.75rem' }}>
              Example: <code>100</code> for a bonus, <code>-50</code> for a penalty deduction.
            </span>
          </label>

          <label>
            Mandatory Reason &amp; Reference
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., First-blood speed bonus for Web challenge or hint purchase penalty."
              required
            />
          </label>

          <div className="modal-actions">
            <button type="button" className="secondary" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" disabled={submitting}>
              {submitting ? 'Applying…' : 'Record Score Adjustment'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Reverse Adjustment Modal */}
      <Modal
        isOpen={reverseModalOpen}
        onClose={() => setReverseModalOpen(false)}
        title="Reverse Score Adjustment"
        maxWidth={480}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleConfirmReversal()
          }}
          className="form"
        >
          {reverseError && (
            <div className="error" style={{ marginBottom: '1rem' }}>
              {reverseError}
            </div>
          )}
          <p style={{ margin: '0 0 1rem', color: 'var(--text-muted)' }}>
            Are you sure you want to reverse adjustment #{adjustmentToReverse?.id} (
            {adjustmentToReverse?.points > 0 ? '+' : ''}
            {adjustmentToReverse?.points} pts for {adjustmentToReverse?.username})?
            The player&apos;s score will be restored accordingly.
          </p>

          <label>
            Reversal Explanation Reason
            <input
              type="text"
              value={reversalReason}
              onChange={(e) => setReversalReason(e.target.value)}
              placeholder="Reason for reversing this adjustment"
              required
            />
          </label>

          <div className="modal-actions">
            <button
              type="button"
              className="secondary"
              onClick={() => setReverseModalOpen(false)}
              disabled={reversing}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="danger-button"
              disabled={reversing}
            >
              {reversing ? 'Reversing…' : 'Confirm Reversal'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
