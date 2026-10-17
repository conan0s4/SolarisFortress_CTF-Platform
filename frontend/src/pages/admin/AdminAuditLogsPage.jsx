import { useEffect, useMemo, useState } from 'react'
import { api } from '../../api'
import Modal from '../../components/common/Modal'
import Badge from '../../components/common/Badge'
import PageHeader from '../../components/common/PageHeader'

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('All')
  const [selectedLog, setSelectedLog] = useState(null)

  async function loadLogs() {
    try {
      setLoading(true)
      const data = await api('/admin/audit-logs/?limit=250')
      setLogs(data)
    } catch (err) {
      setError(err.message || 'Failed to load audit logs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLogs()
  }, [])

  const actions = useMemo(() => {
    const set = new Set(logs.map((l) => l.action))
    return ['All', ...Array.from(set).sort()]
  }, [logs])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return logs.filter((l) => {
      if (actionFilter !== 'All' && l.action !== actionFilter) return false
      if (
        q &&
        !(l.actor_username || '').toLowerCase().includes(q) &&
        !(l.action || '').toLowerCase().includes(q) &&
        !(l.target_repr || '').toLowerCase().includes(q)
      ) {
        return false
      }
      return true
    })
  }, [logs, search, actionFilter])

  if (loading) return <div className="card">Loading audit log stream…</div>

  const headerActions = (
    <button type="button" className="secondary" onClick={loadLogs}>
      Refresh Stream
    </button>
  )

  return (
    <div>
      <PageHeader
        title="Security &amp; Administrative Audit Logs"
        subtitle="Immutable, persistent record of all administrative operations, settings changes, and privileged actions."
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
              placeholder="Search actor, action, or target"
            />
          </div>

          <label className="muted" style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
            Action:
            <select
              className="filter-input"
              style={{ width: 'auto' }}
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
            >
              {actions.map((act) => (
                <option key={act} value={act}>
                  {act}
                </option>
              ))}
            </select>
          </label>

          <div className="spacer" />
          <span className="muted" style={{ fontSize: '0.85rem' }}>
            Showing <strong>{filtered.length}</strong> of {logs.length} audit entries
          </span>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="admin-section">
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Target Entity</th>
                <th>IP Address</th>
                <th className="actions-cell">Details</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((log) => (
                <tr key={log.id}>
                  <td className="muted" style={{ fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td>
                    <strong style={{ color: 'var(--primary)' }}>{log.actor_username}</strong>
                  </td>
                  <td>
                    <span
                      style={{
                        fontFamily: 'monospace',
                        fontSize: '0.82rem',
                        background: 'var(--bg-2)',
                        padding: '0.2rem 0.45rem',
                        borderRadius: 4,
                        border: '1px solid var(--border)',
                      }}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td>
                    <span style={{ color: '#fff', fontWeight: 600 }}>
                      {log.target_repr || '—'}
                    </span>
                    <span className="muted" style={{ fontSize: '0.75rem', marginLeft: '0.4rem' }}>
                      ({log.target_type})
                    </span>
                  </td>
                  <td className="muted" style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                    {log.ip_address || '—'}
                  </td>
                  <td className="actions-cell">
                    {log.details && Object.keys(log.details).length > 0 ? (
                      <button
                        type="button"
                        className="secondary icon-btn btn-text"
                        onClick={() => setSelectedLog(log)}
                      >
                        JSON
                      </button>
                    ) : (
                      <span className="muted" style={{ fontSize: '0.8rem' }}>None</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* JSON Details Modal */}
      <Modal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title={'Audit Event #' + (selectedLog?.id || '') + ' Details'}
        maxWidth={500}
      >
        {selectedLog && (
          <div>
            <dl className="kv" style={{ marginBottom: '1rem' }}>
              <dt>Actor</dt>
              <dd>{selectedLog.actor_username || 'System'}</dd>
              <dt>Action</dt>
              <dd><code>{selectedLog.action}</code></dd>
              <dt>Target</dt>
              <dd>{selectedLog.target_repr || '—'} ({selectedLog.target_type})</dd>
              <dt>Timestamp</dt>
              <dd>{new Date(selectedLog.created_at).toLocaleString()}</dd>
              <dt>Client IP</dt>
              <dd>{selectedLog.ip_address || '—'}</dd>
            </dl>

            <h3
              style={{
                fontSize: '0.95rem',
                color: 'var(--primary)',
                marginBottom: '0.5rem',
              }}
            >
              Payload Details
            </h3>
            <pre
              style={{
                background: 'var(--bg-2)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                padding: '0.85rem',
                fontSize: '0.85rem',
                overflowX: 'auto',
                color: 'var(--text)',
              }}
            >
              {JSON.stringify(selectedLog.details, null, 2)}
            </pre>

            <div className="modal-actions">
              <button type="button" onClick={() => setSelectedLog(null)}>
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
