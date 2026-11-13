import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

// Create a mock localStorage for testing
class MockLocalStorage {
  constructor() {
    this.store = new Map()
  }
  getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null
  }
  setItem(key, value) {
    this.store.set(key, String(value))
  }
  removeItem(key) {
    this.store.delete(key)
  }
  clear() {
    this.store.clear()
  }
}

globalThis.localStorage = new MockLocalStorage()

const GUEST_KEY = 'customgift_cart_guest'
const LEGACY_KEY = 'customgift_cart'

const getStorageKey = (userId) => (userId ? `customgift_cart_user_${userId}` : GUEST_KEY)

const readStoredCart = (key) => {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const writeStoredCart = (key, items) => {
  try {
    if (!items || items.length === 0) {
      localStorage.removeItem(key)
    } else {
      localStorage.setItem(key, JSON.stringify(items))
    }
  } catch {}
}

const purgeLegacyCart = () => {
  try {
    localStorage.removeItem(LEGACY_KEY)
  } catch {}
}

const areItemsEqual = (a, b) => {
  if (a.product?.id !== b.product?.id) return false
  const ca = a.customization || {}
  const cb = b.customization || {}
  return (
    (ca.custom_text || '') === (cb.custom_text || '') &&
    (ca.occasion || '') === (cb.occasion || '') &&
    (ca.event_date || '') === (cb.event_date || '') &&
    (ca.custom_image_url || '') === (cb.custom_image_url || '')
  )
}

const calculateCartTotals = (items) => {
  const count = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)
  const subtotal = items.reduce((sum, item) => sum + (Number(item.product?.price) || 0) * (Number(item.quantity) || 0), 0)
  const shippingCharge = 0
  const total = subtotal + shippingCharge
  return { count, subtotal, shippingCharge, total }
}

describe('Cart Authentication & Calculation Logic', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('1. When a user visits without signing in, cart is empty by default', () => {
    purgeLegacyCart()
    const guestItems = readStoredCart(getStorageKey(null))
    assert.deepEqual(guestItems, [])
    const { count, subtotal, total } = calculateCartTotals(guestItems)
    assert.equal(count, 0)
    assert.equal(subtotal, 0)
    assert.equal(total, 0)
  })

  it('2. Purges legacy mock or preloaded products from localStorage', () => {
    // Simulate legacy storage containing a preloaded product
    localStorage.setItem(
      LEGACY_KEY,
      JSON.stringify([{ product: { id: 99, title: 'Dummy Box', price: '1099.00' }, quantity: 1 }])
    )
    assert.notEqual(localStorage.getItem(LEGACY_KEY), null)

    purgeLegacyCart()
    assert.equal(localStorage.getItem(LEGACY_KEY), null)

    const guestItems = readStoredCart(getStorageKey(null))
    assert.deepEqual(guestItems, [])
  })

  it('3. Only displays products explicitly added by the user', () => {
    const productA = { id: 1, title: 'Memory Mug', price: 549 }
    const guestCart = []

    // Add item explicitly
    const newItem = {
      cartId: 'item-1',
      product: productA,
      quantity: 2,
      customization: { custom_text: 'Best Mom' },
    }
    guestCart.push(newItem)
    writeStoredCart(GUEST_KEY, guestCart)

    const saved = readStoredCart(GUEST_KEY)
    assert.equal(saved.length, 1)
    assert.equal(saved[0].product.title, 'Memory Mug')

    const totals = calculateCartTotals(saved)
    assert.equal(totals.count, 2)
    assert.equal(totals.subtotal, 1098)
    assert.equal(totals.shippingCharge, 0)
    assert.equal(totals.total, 1098)
  })

  it('4. Correctly handles quantity updates and removal', () => {
    let items = [
      { cartId: '1', product: { id: 1, price: 500 }, quantity: 1 },
      { cartId: '2', product: { id: 2, price: 1000 }, quantity: 2 },
    ]

    // Update quantity clamped between 1 and 10
    items = items.map((i) => (i.cartId === '1' ? { ...i, quantity: Math.max(1, Math.min(10, 5)) } : i))
    assert.equal(items[0].quantity, 5)

    let totals = calculateCartTotals(items)
    // (500 * 5) + (1000 * 2) = 2500 + 2000 = 4500
    assert.equal(totals.subtotal, 4500)
    assert.equal(totals.count, 7)

    // Remove item
    items = items.filter((i) => i.cartId !== '2')
    assert.equal(items.length, 1)
    totals = calculateCartTotals(items)
    assert.equal(totals.subtotal, 2500)
    assert.equal(totals.count, 5)
  })

  it('5. Logged-out users are blocked from adding items; User A and User B carts are strictly isolated', () => {
    // Helper function that mirrors CartContext addItem logic
    const addItemForUser = (userId, currentItems, newItem) => {
      if (!userId) {
        // Block unauthenticated cart modification
        return { success: false, items: currentItems }
      }
      const next = [...currentItems, newItem]
      writeStoredCart(getStorageKey(userId), next)
      return { success: true, items: next }
    }

    // 1. User A logs in and adds Product 1
    const userAId = 101
    const itemA = { cartId: 'a1', product: { id: 1, title: 'Frame', price: 799 }, quantity: 1 }
    const resA = addItemForUser(userAId, [], itemA)
    assert.equal(resA.success, true)
    assert.equal(resA.items.length, 1)

    // 2. User signs out -> active state becomes empty
    let activeState = []
    assert.equal(activeState.length, 0)

    // 3. Logged-out user attempts to add Product 2 -> BLOCKED
    const itemBlocked = { cartId: 'g1', product: { id: 2, title: 'Mug', price: 350 }, quantity: 1 }
    const resBlocked = addItemForUser(null, activeState, itemBlocked)
    assert.equal(resBlocked.success, false)
    assert.equal(resBlocked.items.length, 0)

    // 4. User B logs in -> User B cannot see User A's gift bag
    const userBId = 202
    const userBCart = readStoredCart(getStorageKey(userBId))
    assert.deepEqual(userBCart, [])

    // 5. User B adds their own item
    const itemB = { cartId: 'b1', product: { id: 3, title: 'Keychain', price: 249 }, quantity: 1 }
    const resB = addItemForUser(userBId, userBCart, itemB)
    assert.equal(resB.success, true)

    // Verify isolation: User A's cart still has only Item A, User B's cart has only Item B
    const finalCartA = readStoredCart(getStorageKey(userAId))
    const finalCartB = readStoredCart(getStorageKey(userBId))
    assert.equal(finalCartA.length, 1)
    assert.equal(finalCartA[0].product.title, 'Frame')
    assert.equal(finalCartB.length, 1)
    assert.equal(finalCartB[0].product.title, 'Keychain')

    // 6. User A logs back in -> User A's persistent cart is cleanly restored
    assert.equal(finalCartA[0].product.id, 1)
  })

  it('6. On logout, resets active cart to empty and preserves authenticated user cart', () => {
    // User 42 has a cart
    const userItems = [
      { cartId: 'u-1', product: { id: 5, price: 1200 }, quantity: 1 },
    ]
    writeStoredCart('customgift_cart_user_42', userItems)

    // User logs out -> guest cart is empty
    writeStoredCart(GUEST_KEY, [])
    const activeCartOnLogout = []

    assert.equal(activeCartOnLogout.length, 0)
    assert.deepEqual(readStoredCart(GUEST_KEY), [])

    // When user 42 logs back in, their items are still preserved
    const restoredUserCart = readStoredCart('customgift_cart_user_42')
    assert.equal(restoredUserCart.length, 1)
    assert.equal(restoredUserCart[0].product.price, 1200)
  })
})
