import { Loader2, LogOut, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'

export default function SignOutConfirmationModal() {
  const { isSignOutModalOpen, isSigningOut, closeSignOutModal, confirmSignOut } = useAuth()
  const modalRef = useRef(null)
  const cancelButtonRef = useRef(null)

  useEffect(() => {
    if (!isSignOutModalOpen) return

    // Prevent background scrolling while open
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // Automatically focus the cancel button for safe keyboard defaults
    const focusTimeout = setTimeout(() => {
      cancelButtonRef.current?.focus()
    }, 40)

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        if (!isSigningOut) closeSignOutModal()
        return
      }

      if (e.key === 'Tab') {
        const modal = modalRef.current
        if (!modal) return

        const focusable = modal.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
        if (focusable.length === 0) return

        const first = focusable[0]
        const last = focusable[focusable.length - 1]

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault()
            last.focus()
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault()
            first.focus()
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = originalOverflow
      clearTimeout(focusTimeout)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isSignOutModalOpen, isSigningOut, closeSignOutModal])

  if (!isSignOutModalOpen) return null

  return (
    <div
      className="modal-backdrop signout-modal-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSigningOut) {
          closeSignOutModal()
        }
      }}
    >
      <div
        ref={modalRef}
        className="signout-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="signout-modal-title"
        aria-describedby="signout-modal-desc"
      >
        <button
          type="button"
          className="signout-modal-close"
          onClick={closeSignOutModal}
          disabled={isSigningOut}
          aria-label="Close dialog"
        >
          <X size={18} />
        </button>

        <div className="signout-modal-content">
          <div className="signout-modal-icon" aria-hidden="true">
            <LogOut size={26} />
          </div>

          <div className="signout-modal-copy">
            <h3 id="signout-modal-title">Are you sure you want to sign out?</h3>
            <p id="signout-modal-desc">
              You will need to sign in again to access your account and orders.
            </p>
          </div>
        </div>

        <div className="signout-modal-actions">
          <button
            ref={cancelButtonRef}
            type="button"
            className="button button-outline signout-cancel-btn"
            onClick={closeSignOutModal}
            disabled={isSigningOut}
          >
            Cancel
          </button>
          <button
            type="button"
            className="button signout-confirm-btn"
            onClick={confirmSignOut}
            disabled={isSigningOut}
          >
            {isSigningOut ? (
              <>
                <Loader2 size={16} className="spinner-icon" /> Signing out...
              </>
            ) : (
              'Sign out'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
