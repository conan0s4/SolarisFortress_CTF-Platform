import { useEffect, useState } from 'react'
import { api } from '../../api'
import PageHeader from '../../components/common/PageHeader'

function toLocalDatetimeString(isoString) {
  if (!isoString) return ''
  const d = new Date(isoString)
  if (isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  const year = d.getFullYear()
  const month = pad(d.getMonth() + 1)
  const day = pad(d.getDate())
  const hours = pad(d.getHours())
  const minutes = pad(d.getMinutes())
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

export default function AdminCompetitionPage() {
  const [config, setConfig] = useState({
    title: '',
    description: '',
    rules: '',
    start_time: '',
    end_time: '',
    is_active: true,
    scoreboard_frozen: false,
    registration_open: true,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    ;(async () => {
      try {
        setLoading(true)
        const data = await api('/admin/competition/')
        setConfig({
          title: data.title || '',
          description: data.description || '',
          rules: data.rules || '',
          start_time: toLocalDatetimeString(data.start_time),
          end_time: toLocalDatetimeString(data.end_time),
          is_active: !!data.is_active,
          scoreboard_frozen: !!data.scoreboard_frozen,
          registration_open: !!data.registration_open,
        })
      } catch (err) {
        setError(err.message || 'Failed to load competition settings')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setMessage('')
    setError('')

    if (config.start_time && config.end_time) {
      if (new Date(config.end_time) <= new Date(config.start_time)) {
        setError('Competition End Date & Time must be strictly after the Start Date & Time.')
        return
      }
    }

    setSaving(true)

    try {
      const payload = {
        ...config,
        start_time: config.start_time ? new Date(config.start_time).toISOString() : null,
        end_time: config.end_time ? new Date(config.end_time).toISOString() : null,
      }
      await api('/admin/competition/', {
        method: 'PUT',
        body: payload,
      })
      setMessage('Competition settings updated and broadcast successfully!')
    } catch (err) {
      setError(err.message || 'Failed to update competition settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="card">Loading competition configuration…</div>

  return (
    <div>
      <PageHeader
        title="Competition Configuration"
        subtitle="Configure event name, schedules, rules, registration access, and scoreboard visibility."
      />

      <div className="admin-section" style={{ maxWidth: 800 }}>
        {message && <div className="success" style={{ marginBottom: '1.25rem' }}>{message}</div>}
        {error && <div className="error" style={{ marginBottom: '1.25rem' }}>{error}</div>}

        <form onSubmit={handleSubmit} className="form">
          <label>
            Competition Title
            <input
              type="text"
              value={config.title}
              onChange={(e) => setConfig({ ...config, title: e.target.value })}
              required
            />
          </label>

          <label>
            Brief Description / Tagline
            <textarea
              rows={3}
              value={config.description}
              onChange={(e) => setConfig({ ...config, description: e.target.value })}
            />
          </label>

          <label>
            Competition Rules &amp; Guidelines
            <textarea
              rows={6}
              value={config.rules}
              onChange={(e) => setConfig({ ...config, rules: e.target.value })}
            />
          </label>

          <div className="form-row">
            <label>
              Start Date &amp; Time (Optional)
              <input
                type="datetime-local"
                value={config.start_time}
                onChange={(e) => setConfig({ ...config, start_time: e.target.value })}
              />
            </label>

            <label>
              End Date &amp; Time (Optional)
              <input
                type="datetime-local"
                value={config.end_time}
                onChange={(e) => setConfig({ ...config, end_time: e.target.value })}
              />
            </label>
          </div>

          <div
            style={{
              background: 'var(--bg-2)',
              padding: '1rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem',
            }}
          >
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={config.is_active}
                onChange={(e) => setConfig({ ...config, is_active: e.target.checked })}
              />
              <span>
                <strong>Competition Is Active</strong> — When unchecked, all flag submissions are paused.
              </span>
            </label>

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={config.registration_open}
                onChange={(e) => setConfig({ ...config, registration_open: e.target.checked })}
              />
              <span>
                <strong>Player Registrations Open</strong> — When unchecked, new accounts cannot register.
              </span>
            </label>

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={config.scoreboard_frozen}
                onChange={(e) => setConfig({ ...config, scoreboard_frozen: e.target.checked })}
              />
              <span>
                <strong>Scoreboard Is Frozen</strong> — When checked, scores are frozen for public participants (administrators still see live updates).
              </span>
            </label>
          </div>

          <div>
            <button type="submit" disabled={saving}>
              {saving ? 'Saving Settings…' : 'Save Competition Configuration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
