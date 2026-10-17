import { useEffect, useMemo, useState } from 'react'
import { api } from '../../api'
import Modal from '../../components/common/Modal'
import ConfirmModal from '../../components/common/ConfirmModal'
import Badge from '../../components/common/Badge'
import PageHeader from '../../components/common/PageHeader'

const CATEGORIES = [
  'Web',
  'Forensics',
  'Cryptography',
  'Reverse Engineering',
  'OSINT',
  'Miscellaneous',
  'Steganography',
]

const DIFFICULTIES = ['Easy', 'Medium', 'Hard', 'Insane']

export default function AdminChallengesPage() {
  const [challenges, setChallenges] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  // Search and filters
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('All')
  const [filterStatus, setFilterStatus] = useState('all')

  // Modals state
  const [modalOpen, setModalOpen] = useState(false)
  const [editingChallenge, setEditingChallenge] = useState(null)
  const [formValues, setFormValues] = useState({
    name: '',
    category: 'Web',
    difficulty: 'Medium',
    points: 100,
    flag: '',
    description: '',
    hints: '',
    published: true,
  })
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [modalError, setModalError] = useState('')

  // Files manager state
  const [filesModalOpen, setFilesModalOpen] = useState(false)
  const [selectedChallengeForFiles, setSelectedChallengeForFiles] = useState(null)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [filesError, setFilesError] = useState('')

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [challengeToDelete, setChallengeToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  async function loadChallenges() {
    try {
      setLoading(true)
      const data = await api('/admin/challenges/')
      setChallenges(data)
    } catch (err) {
      setError(err.message || 'Failed to load challenges')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadChallenges()
  }, [])

  function openCreateModal() {
    setEditingChallenge(null)
    setModalError('')
    setFormValues({
      name: '',
      category: 'Web',
      difficulty: 'Medium',
      points: 100,
      flag: 'solaris{sample_flag}',
      description: '',
      hints: '',
      published: true,
    })
    setModalOpen(true)
  }

  function openEditModal(c) {
    setEditingChallenge(c)
    setModalError('')
    setFormValues({
      name: c.name,
      category: c.category,
      difficulty: c.difficulty || 'Medium',
      points: c.points,
      flag: c.flag,
      description: c.description,
      hints: c.hints || '',
      published: c.published,
    })
    setModalOpen(true)
  }

  async function handleFormSubmit(e) {
    e.preventDefault()
    setFormSubmitting(true)
    setMessage('')
    setError('')

    try {
      if (editingChallenge) {
        await api(`/admin/challenges/${editingChallenge.id}/`, {
          method: 'PUT',
          body: formValues,
        })
        setMessage(`Challenge '${formValues.name}' updated successfully.`)
      } else {
        await api('/admin/challenges/', {
          method: 'POST',
          body: formValues,
        })
        setMessage(`Challenge '${formValues.name}' created successfully.`)
      }
      setModalOpen(false)
      await loadChallenges()
    } catch (err) {
      setModalError(err.message || 'Failed to save challenge')
    } finally {
      setFormSubmitting(false)
    }
  }

  async function togglePublish(c) {
    try {
      await api(`/admin/challenges/${c.id}/toggle-publish/`, { method: 'POST' })
      await loadChallenges()
    } catch (err) {
      setError(err.message || 'Failed to toggle publish status')
    }
  }

  async function toggleArchive(c) {
    try {
      await api(`/admin/challenges/${c.id}/toggle-archive/`, { method: 'POST' })
      await loadChallenges()
    } catch (err) {
      setError(err.message || 'Failed to toggle archive status')
    }
  }

  async function confirmDelete() {
    if (!challengeToDelete) return
    setDeleting(true)
    try {
      await api(`/admin/challenges/${challengeToDelete.id}/`, { method: 'DELETE' })
      setDeleteModalOpen(false)
      setChallengeToDelete(null)
      setMessage('Challenge deleted successfully.')
      await loadChallenges()
    } catch (err) {
      setError(err.message || 'Failed to delete challenge')
    } finally {
      setDeleting(false)
    }
  }

  function openFilesManager(c) {
    setSelectedChallengeForFiles(c)
    setFilesError('')
    setFilesModalOpen(true)
  }

  async function handleFileUpload(e) {
    const file = e.target.files?.[0]
    if (!file || !selectedChallengeForFiles) return

    setUploadingFile(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      await api(`/admin/challenges/${selectedChallengeForFiles.id}/upload-file/`, {
        method: 'POST',
        body: formData,
      })
      await loadChallenges()
      const updated = await api(`/admin/challenges/${selectedChallengeForFiles.id}/`)
      setSelectedChallengeForFiles(updated)
      setFilesError('')
      e.target.value = ''
    } catch (err) {
      setFilesError(err.message || 'Failed to upload challenge file')
      e.target.value = ''
    } finally {
      setUploadingFile(false)
    }
  }

  async function handleDeleteFile(fileId) {
    if (!selectedChallengeForFiles) return
    try {
      await api(`/admin/challenges/${selectedChallengeForFiles.id}/files/${fileId}/`, {
        method: 'DELETE',
      })
      await loadChallenges()
      const updated = await api(`/admin/challenges/${selectedChallengeForFiles.id}/`)
      setSelectedChallengeForFiles(updated)
      setFilesError('')
    } catch (err) {
      setFilesError(err.message || 'Failed to delete file')
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return challenges.filter((c) => {
      if (filterCategory !== 'All' && c.category !== filterCategory) return false
      if (filterStatus === 'published' && (!c.published || c.is_archived)) return false
      if (filterStatus === 'draft' && (c.published || c.is_archived)) return false
      if (filterStatus === 'archived' && !c.is_archived) return false
      if (
        q &&
        !(c.name || '').toLowerCase().includes(q) &&
        !(c.flag || '').toLowerCase().includes(q)
      ) {
        return false
      }
      return true
    })
  }, [challenges, search, filterCategory, filterStatus])

  if (loading) return <div className="card">Loading challenges…</div>

  const headerActions = (
    <button type="button" onClick={openCreateModal}>
      + Create Challenge
    </button>
  )

  return (
    <div>
      <PageHeader
        title="Challenge Management"
        subtitle="Create, edit, attach files, configure flags, and publish challenges."
        actions={headerActions}
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
              placeholder="Search name or flag"
            />
          </div>

          <label className="muted" style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
            Category:
            <select
              className="filter-input"
              style={{ width: 'auto' }}
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="All">All Categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </label>

          <label className="muted" style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
            Status:
            <select
              className="filter-input"
              style={{ width: 'auto' }}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="published">Published</option>
              <option value="draft">Draft (Unpublished)</option>
              <option value="archived">Archived</option>
            </select>
          </label>

          <div className="spacer" />
          <span className="muted" style={{ fontSize: '0.85rem' }}>
            {filtered.length} of {challenges.length} challenges
          </span>
        </div>
      </div>

      {/* Challenges Table */}
      <div className="admin-section">
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Challenge Name</th>
                <th>Category</th>
                <th>Difficulty</th>
                <th>Points</th>
                <th>Flag</th>
                <th>Status</th>
                <th>Files</th>
                <th>Solves</th>
                <th className="actions-cell">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td>
                    <strong style={{ color: '#fff' }}>{c.name}</strong>
                  </td>
                  <td>{c.category}</td>
                  <td>
                    <Badge variant={'diff-' + (c.difficulty || 'medium').toLowerCase()}>
                      {c.difficulty || 'Medium'}
                    </Badge>
                  </td>
                  <td>
                    <strong style={{ color: 'var(--accent)' }}>{c.points}</strong>
                  </td>
                  <td>
                    <code
                      style={{
                        fontSize: '0.8rem',
                        background: 'var(--bg-2)',
                        padding: '0.2rem 0.4rem',
                        borderRadius: 4,
                      }}
                    >
                      {c.flag}
                    </code>
                  </td>
                  <td>
                    {c.is_archived ? (
                      <Badge variant="warning">Archived</Badge>
                    ) : c.published ? (
                      <Badge variant="success">Published</Badge>
                    ) : (
                      <Badge variant="default">Draft</Badge>
                    )}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="secondary icon-btn btn-text"
                      onClick={() => openFilesManager(c)}
                    >
                      {c.files?.length || 0} files
                    </button>
                  </td>
                  <td>{c.solve_count || 0}</td>
                  <td className="actions-cell">
                    <div className="action-group">
                      <button
                        type="button"
                        className="secondary icon-btn btn-text"
                        onClick={() => openEditModal(c)}
                        title="Edit challenge"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="secondary icon-btn btn-text"
                        onClick={() => togglePublish(c)}
                        title={c.published ? 'Unpublish' : 'Publish'}
                      >
                        {c.published ? 'Hide' : 'Publish'}
                      </button>
                      <button
                        type="button"
                        className="secondary icon-btn btn-text"
                        onClick={() => toggleArchive(c)}
                        title={c.is_archived ? 'Unarchive' : 'Archive'}
                      >
                        {c.is_archived ? 'Unarchive' : 'Archive'}
                      </button>
                      <button
                        type="button"
                        className="danger-button icon-btn btn-text danger"
                        onClick={() => {
                          setChallengeToDelete(c)
                          setDeleteModalOpen(true)
                        }}
                        title="Delete challenge"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Challenge Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingChallenge ? 'Edit Challenge: ' + editingChallenge.name : 'Create New Challenge'}
        maxWidth={640}
      >
        <form onSubmit={handleFormSubmit} className="form">
          {modalError && (
            <div className="error" style={{ marginBottom: '1rem' }}>
              {modalError}
            </div>
          )}
          <label>
            Challenge Title
            <input
              type="text"
              value={formValues.name}
              onChange={(e) => setFormValues({ ...formValues, name: e.target.value })}
              required
            />
          </label>

          <div className="form-row">
            <label>
              Category
              <select
                value={formValues.category}
                onChange={(e) => setFormValues({ ...formValues, category: e.target.value })}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Difficulty
              <select
                value={formValues.difficulty}
                onChange={(e) => setFormValues({ ...formValues, difficulty: e.target.value })}
              >
                {DIFFICULTIES.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Points Awarded
              <input
                type="number"
                min="10"
                max="5000"
                value={formValues.points}
                onChange={(e) =>
                  setFormValues({ ...formValues, points: Number(e.target.value) })}
                required
              />
            </label>
          </div>

          <label>
            Correct Flag String
            <input
              type="text"
              value={formValues.flag}
              onChange={(e) => setFormValues({ ...formValues, flag: e.target.value })}
              placeholder="solaris{secret_flag_string}"
              required
            />
            <span className="muted" style={{ fontSize: '0.75rem' }}>
              Stored securely on backend; never sent to non-admin participants.
            </span>
          </label>

          <label>
            Description / Mission Briefing
            <textarea
              rows={4}
              value={formValues.description}
              onChange={(e) => setFormValues({ ...formValues, description: e.target.value })}
              required
            />
          </label>

          <label>
            Hints (Optional)
            <textarea
              rows={2}
              value={formValues.hints}
              onChange={(e) => setFormValues({ ...formValues, hints: e.target.value })}
              placeholder="Optional hints for stuck players…"
            />
          </label>

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={formValues.published}
              onChange={(e) => setFormValues({ ...formValues, published: e.target.checked })}
            />
            <span>Publish immediately (visible to participants)</span>
          </label>

          <div className="modal-actions">
            <button type="button" className="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" disabled={formSubmitting}>
              {formSubmitting ? 'Saving…' : editingChallenge ? 'Update Challenge' : 'Create Challenge'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Files Manager Modal */}
      <Modal
        isOpen={filesModalOpen}
        onClose={() => setFilesModalOpen(false)}
        title={'Attached Files: ' + (selectedChallengeForFiles?.name || '')}
        maxWidth={540}
      >
        <div>
          {filesError && (
            <div className="error" style={{ marginBottom: '1rem' }}>
              {filesError}
            </div>
          )}
          <p className="muted" style={{ margin: '0 0 1rem' }}>
            Upload downloadable challenge binaries, packet captures (PCAP), memory dumps, or image files.
          </p>

          <div style={{ marginBottom: '1.25rem' }}>
            <label>
              Upload New File:
              <input
                type="file"
                onChange={handleFileUpload}
                disabled={uploadingFile}
                style={{ marginTop: '0.5rem' }}
              />
            </label>
            {uploadingFile && <p className="muted">Uploading file…</p>}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {selectedChallengeForFiles?.files && selectedChallengeForFiles.files.length > 0 ? (
              selectedChallengeForFiles.files.map((f) => (
                <div key={f.id} className="file-item">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="file-icon">[file]</span>
                      <strong>{f.original_name || 'file_' + f.id}</strong>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <a
                      href={f.download_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn secondary icon-btn btn-text"
                    >
                      Download
                    </a>
                    <button
                      type="button"
                      className="danger-button icon-btn btn-text danger"
                      onClick={() => handleDeleteFile(f.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="muted">No files currently attached to this challenge.</p>
            )}
          </div>

          <div className="modal-actions">
            <button type="button" onClick={() => setFilesModalOpen(false)}>
              Close
            </button>
          </div>
        </div>
      </Modal>

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Challenge"
         message={'Are you sure you want to permanently delete ' + (challengeToDelete?.name || '') + '? This will also remove all associated solves and submissions.'}
        confirmText="Delete Challenge"
        loading={deleting}
      />
    </div>
  )
}
