import Modal from './Modal'

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message,
  confirmText = 'Confirm',
  confirmVariant = 'danger-button',
  loading = false,
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth={460}>
      <p style={{ margin: '0.5rem 0 1.5rem', color: 'var(--text-muted)' }}>
        {message}
      </p>
      <div className="modal-actions">
        <button
          type="button"
          className="secondary"
          onClick={onClose}
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="button"
          className={confirmVariant}
          onClick={onConfirm}
          disabled={loading}
        >
          {loading ? 'Processing…' : confirmText}
        </button>
      </div>
    </Modal>
  )
}
