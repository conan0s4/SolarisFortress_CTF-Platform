import { useState } from 'react'
import { API_BASE } from '../../api'
import PageHeader from '../../components/common/PageHeader'

export default function AdminExportPage() {
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState('')

  async function triggerDownload(endpoint, defaultFilename) {
    setDownloading(true)
    setError('')
    try {
      const token = localStorage.getItem('sf_token')
      const headers = {}
      if (token) headers['Authorization'] = `Token ${token}`

      const res = await fetch(`${API_BASE}${endpoint}`, {
        credentials: 'include',
        headers,
      })
      if (!res.ok) {
        let msg = `Export download failed with status ${res.status}`
        try {
          const ct = res.headers.get('content-type') || ''
          if (ct.includes('application/json')) {
            const errData = await res.json()
            if (errData?.detail) msg = errData.detail
          } else {
            const txt = await res.text()
            if (txt) msg = txt
          }
        } catch {}
        throw new Error(msg)
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = defaultFilename
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError(err.message || 'Export failed')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Data Export &amp; Archives"
        subtitle="Generate and export official CSV reports for competition judging, grading, and post-event analysis."
      />

      {error && <div className="error" style={{ marginBottom: '1.25rem' }}>{error}</div>}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.5rem',
        }}
      >
        {/* Scoreboard Export */}
        <div className="card">
          <h2 className="card-title">Official Scoreboard CSV</h2>
          <p className="muted" style={{ fontSize: '0.92rem', lineHeight: '1.6' }}>
            Exports full standings including ranks, participants, total authoritative points, solve counts, solve points, and manual adjustments.
          </p>
          <div style={{ marginTop: '1.5rem' }}>
            <button
              type="button"
              onClick={() => triggerDownload('/admin/export/scores/', 'solarisfortress_scores.csv')}
              disabled={downloading}
            >
              Download Scoreboard CSV
            </button>
          </div>
        </div>

        {/* Submissions Export */}
        <div className="card">
          <h2 className="card-title">All Submissions Log CSV</h2>
          <p className="muted" style={{ fontSize: '0.92rem', lineHeight: '1.6' }}>
            Exports complete historical flag submissions log with participant usernames, challenge IDs, submitted strings, verdicts, and precise timestamps.
          </p>
          <div style={{ marginTop: '1.5rem' }}>
            <button
              type="button"
              className="secondary"
              onClick={() => triggerDownload('/admin/export/submissions/', 'solarisfortress_submissions.csv')}
              disabled={downloading}
            >
              Download Submissions CSV
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
