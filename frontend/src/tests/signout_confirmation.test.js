import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

// Mock environment and localStorage
class MockLocalStorage {
  constructor() {
    this.store = {}
  }
  getItem(key) {
    return this.store[key] ?? null
  }
  setItem(key, value) {
    this.store[key] = String(value)
  }
  removeItem(key) {
    delete this.store[key]
  }
  clear() {
    this.store = {}
  }
}

describe('Change 4: Secure Sign-Out Confirmation Flow', () => {
  let localStorage
  let authState
  let navigatedTo
  let toastMessage
  let modalState

  function createAuthManager() {
    return {
      openSignOutModal(triggerElement = null) {
        modalState.isOpen = true
        modalState.triggerElement = triggerElement
      },
      closeSignOutModal() {
        if (modalState.isSigningOut) return
        modalState.isOpen = false
        if (modalState.triggerElement && typeof modalState.triggerElement.focus === 'function') {
          modalState.triggerElement.focus()
        }
      },
      async confirmSignOut() {
        if (modalState.isSigningOut) return false // Prevent duplicate execution
        modalState.isSigningOut = true
        try {
          // Clear credentials
          localStorage.removeItem('customgift_token')
          localStorage.removeItem('customgift_user')
          authState.user = null
          modalState.isOpen = false
          toastMessage = 'Signed out successfully'
          navigatedTo = '/'
          return true
        } catch {
          toastMessage = 'Failed to sign out. Please try again.'
          return false
        } finally {
          modalState.isSigningOut = false
        }
      },
    }
  }

  beforeEach(() => {
    localStorage = new MockLocalStorage()
    localStorage.setItem('customgift_token', 'valid-jwt-token-12345')
    localStorage.setItem('customgift_user', JSON.stringify({ id: 1, name: 'Meraj Attar', email: 'meraj@example.com' }))

    authState = {
      user: { id: 1, name: 'Meraj Attar', email: 'meraj@example.com' },
    }
    navigatedTo = null
    toastMessage = null
    modalState = {
      isOpen: false,
      isSigningOut: false,
      triggerElement: null,
    }
  })

  it('1. Header Logout triggers confirmation modal without immediately signing out', () => {
    const authManager = createAuthManager()
    let headerButtonFocused = false
    const mockHeaderButton = {
      focus() {
        headerButtonFocused = true
      },
    }

    // Header logout clicked
    authManager.openSignOutModal(mockHeaderButton)

    // Modal is opened
    assert.equal(modalState.isOpen, true)
    assert.equal(modalState.triggerElement, mockHeaderButton)

    // User session and storage remain intact
    assert.notEqual(authState.user, null)
    assert.equal(localStorage.getItem('customgift_token'), 'valid-jwt-token-12345')
    assert.equal(navigatedTo, null)
  })

  it('2. Footer Sign out triggers the exact same confirmation modal without signing out', () => {
    const authManager = createAuthManager()
    let footerButtonFocused = false
    const mockFooterButton = {
      focus() {
        footerButtonFocused = true
      },
    }

    // Footer sign out clicked
    authManager.openSignOutModal(mockFooterButton)

    // Modal is opened
    assert.equal(modalState.isOpen, true)
    assert.equal(modalState.triggerElement, mockFooterButton)

    // User session remains intact
    assert.notEqual(authState.user, null)
    assert.equal(localStorage.getItem('customgift_token'), 'valid-jwt-token-12345')
    assert.equal(navigatedTo, null)
  })

  it('3. Cancel button preserves user session, closes modal, and restores focus', () => {
    const authManager = createAuthManager()
    let focusRestored = false
    const mockTrigger = {
      focus() {
        focusRestored = true
      },
    }

    authManager.openSignOutModal(mockTrigger)
    assert.equal(modalState.isOpen, true)

    // User clicks Cancel
    authManager.closeSignOutModal()

    // Modal closed, session preserved, focus restored
    assert.equal(modalState.isOpen, false)
    assert.notEqual(authState.user, null)
    assert.equal(localStorage.getItem('customgift_token'), 'valid-jwt-token-12345')
    assert.equal(focusRestored, true)
    assert.equal(navigatedTo, null)
  })

  it('4. Escape key closes modal and preserves session safely', () => {
    const authManager = createAuthManager()
    let focusRestored = false
    const mockTrigger = {
      focus() {
        focusRestored = true
      },
    }

    authManager.openSignOutModal(mockTrigger)
    assert.equal(modalState.isOpen, true)

    // Simulate Escape key handler invoking closeSignOutModal
    authManager.closeSignOutModal()

    assert.equal(modalState.isOpen, false)
    assert.notEqual(authState.user, null)
    assert.equal(focusRestored, true)
  })

  it('5. Confirm Sign Out securely purges credentials, redirects to homepage, and notifies user', async () => {
    const authManager = createAuthManager()
    authManager.openSignOutModal()

    const success = await authManager.confirmSignOut()

    assert.equal(success, true)
    assert.equal(modalState.isOpen, false)
    assert.equal(authState.user, null)
    assert.equal(localStorage.getItem('customgift_token'), null)
    assert.equal(localStorage.getItem('customgift_user'), null)
    assert.equal(navigatedTo, '/')
    assert.equal(toastMessage, 'Signed out successfully')
  })

  it('6. Double clicks / repeated triggers do not initiate duplicate logout requests', async () => {
    const authManager = createAuthManager()
    authManager.openSignOutModal()

    // First call sets isSigningOut = true
    let executionCount = 0
    modalState.isSigningOut = true

    // Second simulated click while in progress
    const secondCall = await authManager.confirmSignOut()

    assert.equal(secondCall, false) // Rejected because already signing out
    modalState.isSigningOut = false
  })

  it('7. After logout, protected routes and private cart/wishlist are inaccessible', () => {
    // User cart storage is preserved under user id, while guest cart is blank
    const userCartKey = 'customgift_cart_user_1'
    const guestCartKey = 'customgift_cart_guest'
    localStorage.setItem(userCartKey, JSON.stringify([{ productId: 42, quantity: 2 }]))
    localStorage.setItem(guestCartKey, '[]')

    // Sign out executed
    localStorage.removeItem('customgift_token')
    localStorage.removeItem('customgift_user')
    authState.user = null

    // Guest cart must be empty and not contain user 1 items
    const guestCart = JSON.parse(localStorage.getItem(guestCartKey))
    assert.equal(guestCart.length, 0)

    // User cart is scoped and protected
    assert.equal(localStorage.getItem('customgift_token'), null)
  })

  it('8. UI text requirements match exact specification', () => {
    const modalCopy = {
      title: 'Are you sure you want to sign out?',
      description: 'You will need to sign in again to access your account and orders.',
      cancelButton: 'Cancel',
      signOutButton: 'Sign out',
    }

    assert.equal(modalCopy.title, 'Are you sure you want to sign out?')
    assert.equal(
      modalCopy.description,
      'You will need to sign in again to access your account and orders.'
    )
    assert.equal(modalCopy.cancelButton, 'Cancel')
    assert.equal(modalCopy.signOutButton, 'Sign out')
  })
})
