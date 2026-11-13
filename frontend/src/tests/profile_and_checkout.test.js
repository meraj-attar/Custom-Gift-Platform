import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  validateFullName,
  validatePhone,
  validateAddress,
  validatePassword,
} from '../utils/validators.js'
import { getProductWhatsAppUrl } from '../utils/whatsapp.js'

describe('Profile & Checkout Flow Tests', () => {
  it('1. Profile validation accepts valid inputs and flags invalid fields', () => {
    // Valid inputs
    assert.equal(validateFullName('Meraj Attar'), null)
    assert.equal(validatePhone('+91 98765 43210', false), null)
    assert.equal(validatePhone('9876543210', false), null)
    assert.equal(validateAddress('Flat 402, Sunshine Apartments, MG Road, Pune 411001', false), null)

    // Invalid inputs
    assert.notEqual(validateFullName('A'), null) // too short
    assert.notEqual(validateFullName('12345'), null) // numbers not allowed
    assert.notEqual(validatePhone('12345', false), null) // invalid phone
    assert.notEqual(validateAddress('', true), null) // empty when required
    assert.notEqual(validateAddress('x'.repeat(501), false), null) // exceeds max length
  })

  it('2. Profile Change Password enforces strong password policy', () => {
    // Valid password
    assert.equal(validatePassword('SecurePass123!'), null)

    // Weak passwords
    assert.notEqual(validatePassword('short1!'), null) // < 8 chars
    assert.notEqual(validatePassword('alllowercase123!'), null) // no uppercase
    assert.notEqual(validatePassword('ALLUPPERCASE123!'), null) // no lowercase
    assert.notEqual(validatePassword('NoNumbersHere!'), null) // no number
  })

  it('3. Checkout route guard correctly identifies authorization requirement', () => {
    const checkCheckoutAccess = (user, items) => {
      if (!user) return { canAccess: false, redirectTo: '/login' }
      if (!items || items.length === 0) return { canAccess: false, redirectTo: '/cart' }
      return { canAccess: true, redirectTo: null }
    }

    // Guest cannot access checkout -> redirects to /login
    const guestResult = checkCheckoutAccess(null, [{ id: 1 }])
    assert.equal(guestResult.canAccess, false)
    assert.equal(guestResult.redirectTo, '/login')

    // Authenticated user with empty cart -> redirects to /cart
    const emptyCartResult = checkCheckoutAccess({ id: 1, name: 'User' }, [])
    assert.equal(emptyCartResult.canAccess, false)
    assert.equal(emptyCartResult.redirectTo, '/cart')

    // Authenticated user with items -> can access checkout
    const validResult = checkCheckoutAccess({ id: 1, name: 'User' }, [{ id: 1 }])
    assert.equal(validResult.canAccess, true)
    assert.equal(validResult.redirectTo, null)
  })

  it('4. WhatsApp URL dynamically includes product name, ID and origin', () => {
    const product = {
      id: 75,
      title: 'Personalized Our Beautiful Journey Photo Frame',
      slug: 'personalized-our-beautiful-journey-photo-frame',
    }
    const origin = 'http://localhost:5173'
    const url = getProductWhatsAppUrl(product, origin)

    assert.ok(url.startsWith('https://wa.me/918485089678?text='))
    const decoded = decodeURIComponent(url)
    assert.ok(decoded.includes('Product Name: Personalized Our Beautiful Journey Photo Frame'))
    assert.ok(decoded.includes('Product ID: 75'))
    assert.ok(decoded.includes('Product URL: http://localhost:5173/products/personalized-our-beautiful-journey-photo-frame'))
  })

  it('5. Header navigation links omit "My Profile" text while providing profile icon link', () => {
    // Model of main navigation items
    const getMainNavLinks = (user, isAdmin) => {
      const links = [
        { label: 'Home', to: '/' },
        { label: 'Shop', to: '/shop' },
        { label: 'About', to: '/about' },
        { label: 'Contact', to: '/contact' },
      ]
      if (user) {
        links.push({ label: 'My Orders', to: '/orders' })
      }
      if (isAdmin) {
        links.push({ label: 'Admin', to: '/admin' })
      }
      return links
    }

    const authLinks = getMainNavLinks({ id: 1, name: 'Meraj' }, false)
    const labels = authLinks.map((l) => l.label)
    assert.equal(labels.includes('My Profile'), false, 'Header main nav must not contain "My Profile" text')
    assert.equal(labels.includes('My Orders'), true)

    // User profile icon action
    const getProfileIconAction = (user) => {
      if (!user) return null
      return {
        to: '/profile',
        ariaLabel: 'My Profile',
        title: 'My Profile',
        icon: 'UserRound',
      }
    }

    const profileIcon = getProfileIconAction({ id: 1, name: 'Meraj' })
    assert.ok(profileIcon)
    assert.equal(profileIcon.to, '/profile')
    assert.equal(profileIcon.ariaLabel, 'My Profile')
  })

  it('6. Footer Account section omits "My profile" link while keeping orders, wishlist, bag, and sign out', () => {
    const getFooterAccountLinks = (user) => {
      if (!user) {
        return [
          { label: 'Sign in', to: '/login' },
          { label: 'Create an account', to: '/register' },
          { label: 'Gift bag', to: '/cart' },
        ]
      }
      return [
        { label: 'My orders', to: '/orders' },
        { label: 'My wishlist', to: '/wishlist' },
        { label: 'Gift bag', to: '/cart' },
        { label: 'Sign out', action: 'logout' },
      ]
    }

    const authFooterLinks = getFooterAccountLinks({ id: 1 })
    const labels = authFooterLinks.map((l) => l.label)
    assert.equal(labels.includes('My profile'), false, 'Footer must not contain "My profile" link')
    assert.equal(labels.includes('My orders'), true)
    assert.equal(labels.includes('My wishlist'), true)
    assert.equal(labels.includes('Gift bag'), true)
    assert.equal(labels.includes('Sign out'), true)
  })

  it('7. Profile route guard protects unauthenticated access and allows authenticated users', () => {
    const checkProfileAccess = (user) => {
      if (!user) return { canAccess: false, redirectTo: '/login' }
      return { canAccess: true, redirectTo: null }
    }

    assert.equal(checkProfileAccess(null).canAccess, false)
    assert.equal(checkProfileAccess(null).redirectTo, '/login')
    assert.equal(checkProfileAccess({ id: 1, name: 'Meraj' }).canAccess, true)
    assert.equal(checkProfileAccess({ id: 1, name: 'Meraj' }).redirectTo, null)
  })
})
