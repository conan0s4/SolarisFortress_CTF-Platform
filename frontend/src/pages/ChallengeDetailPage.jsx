import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api'

export default function ChallengeDetailPage() {
  const { id } = useParams()
  const [challenge, setChallenge] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [flag, setFlag] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState(null) // { kind: 'success'|'error', message }

  async function load() {
    setLoading(true)
    setError('')
    try {
      const data = await api(`/challenges/${id}/`)
      setChallenge(data)
    } catch (err) {
      setError(err.message || 'Failed to load challenge')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function onSubmit(e) {
    e.preventDefault()
    setFeedback(null)
    if (!flag.trim()) {
      setFeedback({ kind: 'error', message: 'Enter a flag.' })
      return
    }
    setSubmitting(true)
    try {
      const res = await api(`/challenges/${id}/submit/`, {
        method: 'POST',
        body: { flag },
      })
      if (res.is_correct) {
        if (res.awarded_points > 0) {
          setFeedback({
            kind: 'success',
            message: `Correct! You earned ${res.awarded_points} points.`,
          })
        } else {
          setFeedback({
            kind: 'success',
            message: 'Correct! (You had already solved this challenge — no extra points.)',
          })
        }
      } else {
        setFeedback({ kind: 'error', message: 'Incorrect flag. Try again.' })
      }
      // Refresh challenge to update solved badge
      await load()
      setFlag('')
    } catch (err) {
      setFeedback({ kind: 'error', message: err.message || 'Submission failed' })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="card">Loading challenge…</div>
  if (error) return <div className="card error">{error}</div>
  if (!challenge) return null

  return (
    <div>
      <p>
        <Link to="/challenges">← Back to challenges</Link>
      </p>

      <div className="card">
        <div className="row">
          <h1 style={{ marginRight: 'auto' }}>{challenge.name}</h1>
          {challenge.solved && <span className="badge solved" style={{
            background: 'rgba(74, 222, 128, 0.15)',
            border: '1px solid rgba(74, 222, 128, 0.5)',
            color: 'var(--success)',
            padding: '0.3rem 0.7rem',
            borderRadius: 999,
            fontSize: '0.85rem',
          }}>Solved</span>}
        </div>
        <dl className="kv">
          <dt>Category</dt><dd>{challenge.category}</dd>
          <dt>Points</dt><dd><strong style={{ color: 'var(--accent)' }}>{challenge.points}</strong></dd>
        </dl>
      </div>

      <div className="card">
        <h2>Description</h2>
        <div className="description">{challenge.description}</div>
      </div>

      <div className="card files">
        <h2>Files</h2>
        {challenge.files && challenge.files.length > 0 ? (
          <ul>
            {challenge.files.map((f) => (
              <li key={f.id}>
                <a href={f.download_url} target="_blank" rel="noopener noreferrer">
                  Download {f.original_name || `file #${f.id}`}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">No files attached.</p>
        )}
      </div>

      <div className="card">
        <h2>Submit flag</h2>
        <p className="muted">Flags follow the format <code>solaris{'{...}'}</code>.</p>
        <form className="form" onSubmit={onSubmit} style={{ maxWidth: 520 }}>
          {feedback && (
            <div className={feedback.kind === 'success' ? 'success' : 'error'}>
              {feedback.message}
            </div>
          )}
          <label>
            Flag
            <input
              type="text"
              value={flag}
              onChange={(e) => setFlag(e.target.value)}
              placeholder="solaris{...}"
              autoComplete="off"
              spellCheck="false"
            />
          </label>
          <div>
            <button type="submit" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit Flag'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}