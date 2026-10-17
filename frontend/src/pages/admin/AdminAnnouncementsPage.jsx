import { useEffect, useState } from 'react'
import { api } from '../../api'
import Modal from '../../components/common/Modal'
import ConfirmModal from '../../components/common/ConfirmModal'
import Badge from '../../components/common/Badge'
import PageHeader from '../../components/common/PageHeader'

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  // Create / Edit Modal
  const [modalOpen, setModalOpen] = useState(false)
  const [editingAnn, setEditingAnn] = useState(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [isPinned, setIsPinned] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [modalError, setModalError] = useState('')

  // Delete Modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [annToDelete, setAnnToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  async function loadAnnouncements() {
    try {
      setLoading(true)
      const data = await api('/admin/announcements/')
      setAnnouncements(data)
    } catch (err) {
      setError(err.message || 'Failed to load announcements')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAnnouncements()
  }, [])

  function openCreateModal() {
    setEditingAnn(null)
    setTitle('')
    setContent('')
    setIsPinned(false)
    setModalError('')
    setModalOpen(true)
  }

  function openEditModal(ann) {
    setEditingAnn(ann)
    setTitle(ann.title)
    setContent(ann.content)
    setIsPinned(ann.is_pinned)
    setModalError('')
    setModalOpen(true)
  }

  async function handleFormSubmit(e) {
    e.preventDefault()
    setModalError('')
    if (!title.trim() || !content.trim()) {
      setModalError('Title and content are required.')
      return
    }

    setSubmitting(true)
    setMessage('')
    setError('')

    try {
      if (editingAnn) {
        await api(`/admin/announcements/${editingAnn.id}/`, {
          method: 'PUT',
          body: { title: title.trim(), content: content.trim(), is_pinned: isPinned },
        })
        setMessage('Announcement updated successfully.')
      } else {
        await api('/admin/announcements/', {
          method: 'POST',
          body: { title: title.trim(), content: content.trim(), is_pinned: isPinned },
        })
        setMessage('Announcement broadcasted successfully.')
      }
      setModalOpen(false)
      await loadAnnouncements()
    } catch (err) {
      setModalError(err.message || 'Failed to save announcement')
    } finally {
      setSubmitting(false)
    }
  }

  async function confirmDelete() {
    if (!annToDelete) return
    setDeleting(true)
    try {
      await api(`/admin/announcements/${annToDelete.id}/`, { method: 'DELETE' })
      setDeleteModalOpen(false)
      setAnnToDelete(null)
      setMessage('Announcement deleted.')
      await loadAnnouncements()
    } catch (err) {
      setError(err.message || 'Failed to delete announcement')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return <div className="card">Loading announcements…</div>

  const headerActions = (
    <button type="button" onClick={openCreateModal}>
      + New Announcement
    </button>
  )

  return (
    <div>
      <PageHeader
        title="Announcements Broadcast Manager"
        subtitle="Broadcast real-time hints, platform news, or schedule updates to all participants."
        actions={headerActions}
      />

      {message && <div className="success" style={{ marginBottom: '1.25rem' }}>{message}</div>}
      {error && <div className="error" style={{ marginBottom: '1.25rem' }}>{error}</div>}

      <div className="admin-section">
        {announcements.length === 0 ? (
          <p className="muted" style={{ margin: '1rem 0' }}>
            No announcements broadcasted yet.
          </p>
        ) : (
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 80 }}>Type</th>
                  <th>Title</th>
                  <th>Content Preview</th>
                  <th>Author</th>
                  <th>Published Time</th>
                  <th className="actions-cell">Actions</th>
                </tr>
              </thead>
              <tbody>
                {announcements.map((ann) => (
                  <tr key={ann.id}>
                    <td>
                      {ann.is_pinned ? (
                        <Badge variant="warning">Pinned</Badge>
                      ) : (
                        <Badge variant="default">News</Badge>
                      )}
                    </td>
                    <td>
                      <strong style={{ color: '#fff' }}>{ann.title}</strong>
                    </td>
                    <td style={{ maxWidth: 350, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ann.content}
                    </td>
                    <td className="muted">{ann.created_by_username || 'Organizer'}</td>
                    <td className="muted" style={{ fontSize: '0.82rem' }}>
                      {new Date(ann.created_at).toLocaleString()}
                    </td>
                    <td className="actions-cell">
                      <div className="action-group">
                        <button
                          type="button"
                          className="secondary icon-btn btn-text"
                          onClick={() => openEditModal(ann)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="danger-button icon-btn btn-text danger"
                          onClick={() => {
                            setAnnToDelete(ann)
                            setDeleteModalOpen(true)
                          }}
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
        )}
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingAnn ? 'Edit Announcement' : 'Post New Announcement'}
        maxWidth={540}
      >
        <form onSubmit={handleFormSubmit} className="form">
          {modalError && (
            <div className="error" style={{ marginBottom: '1rem' }}>
              {modalError}
            </div>
          )}
          <label>
            Announcement Title
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Hint released for Cryptography challenge!"
              required
            />
          </label>

          <label>
            Announcement Content
            <textarea
              rows={5}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write announcement message for players…"
              required
            />
          </label>

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={isPinned}
              onChange={(e) => setIsPinned(e.target.checked)}
            />
            <span>Pin this announcement at the top of the participant dashboard</span>
          </label>

          <div className="modal-actions">
            <button type="button" className="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" disabled={submitting}>
              {submitting ? 'Broadcasting…' : editingAnn ? 'Update' : 'Broadcast Now'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm Modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Announcement"
        message={`Delete announcement '${annToDelete?.title}'? This will remove it from participant dashboards.`}
        confirmText="Delete"
        loading={deleting}
      />
    </div>
  )
}
