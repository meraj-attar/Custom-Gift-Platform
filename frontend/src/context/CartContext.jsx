import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { useAuth } from './AuthContext'

const CartContext = createContext(null)

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
  } catch {
    // Ignore storage quota or restricted access errors
  }
}

// Clean up legacy generic/mock cart data
const purgeLegacyCart = () => {
  try {
    localStorage.removeItem(LEGACY_KEY)
  } catch {}
}

export const areItemsEqual = (a, b) => {
  if (!a || !b) return false
  if (a.product?.id !== b.product?.id) return false
  const ca = a.customization || {}
  const cb = b.customization || {}
  return (
    (ca.custom_text || '').trim() === (cb.custom_text || '').trim() &&
    (ca.occasion || '').trim() === (cb.occasion || '').trim() &&
    (ca.event_date || '').trim() === (cb.event_date || '').trim() &&
    (ca.custom_image_url || '').trim() === (cb.custom_image_url || '').trim()
  )
}

export const isItemPersonalized = (_item) => false

export const itemNeedsPersonalization = (_item) => false

export const itemMissingRequiredPersonalization = (_item) => false

export function CartProvider({ children }) {
  const { user } = useAuth()
  const currentUserId = user?.id || null
  const prevUserIdRef = useRef(currentUserId)

  // Initialize cart strictly from scoped storage (never preloaded with mock or sample data)
  const [items, setItems] = useState(() => {
    purgeLegacyCart()
    const key = getStorageKey(currentUserId)
    return readStoredCart(key)
  })

  // Synchronize cart state on auth transitions (guest <-> signed-in user)
  useEffect(() => {
    purgeLegacyCart()
    const prevUserId = prevUserIdRef.current
    const nextUserId = currentUserId
    prevUserIdRef.current = nextUserId

    if (prevUserId === nextUserId) return

    // User logs out -> Clear active cart state, preserve user's persisted storage
    if (prevUserId && !nextUserId) {
      writeStoredCart(GUEST_KEY, [])
      setItems([])
      prevUserIdRef.current = null
      return
    }

    // User logs in -> Strictly load only that authenticated user's isolated cart
    if (nextUserId) {
      const userItems = readStoredCart(getStorageKey(nextUserId))
      setItems(userItems)
      prevUserIdRef.current = nextUserId
    } else {
      setItems([])
      prevUserIdRef.current = null
    }
  }, [currentUserId])

  const persist = (next) => {
    setItems(next)
    if (currentUserId) {
      const key = getStorageKey(currentUserId)
      writeStoredCart(key, next)
    }
  }

  const addItem = (newItem) => {
    if (!currentUserId) {
      return false
    }

    const id = newItem.cartId || `citem_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
    const normalizedItem = {
      ...newItem,
      customization: newItem.customization || {},
    }

    // Only merge items if product AND customization configuration are identical
    const existingIndex = items.findIndex((item) => areItemsEqual(item, normalizedItem))

    let next
    if (existingIndex >= 0) {
      const maxAllowed = Math.min(10, Number(items[existingIndex].product?.stock) || 10)
      next = items.map((item, idx) =>
        idx === existingIndex
          ? { ...item, quantity: Math.min(maxAllowed, (item.quantity || 1) + (newItem.quantity || 1)) }
          : item
      )
    } else {
      const maxAllowed = Math.min(10, Number(newItem.product?.stock) || 10)
      next = [
        ...items,
        {
          ...normalizedItem,
          cartId: id,
          quantity: Math.max(1, Math.min(maxAllowed, newItem.quantity || 1)),
        },
      ]
    }
    persist(next)
  }

  const updateQuantity = (cartId, quantity) => {
    const next = items.map((item) => {
      if (item.cartId !== cartId) return item
      const maxAllowed = Math.min(10, Number(item.product?.stock) || 10)
      return { ...item, quantity: Math.max(1, Math.min(maxAllowed, quantity)) }
    })
    persist(next)
  }

  const updateCustomization = (cartId, customization) => {
    const next = items.map((item) => {
      if (item.cartId !== cartId) return item
      return {
        ...item,
        customization: {
          occasion: customization?.occasion || '',
          custom_text: customization?.custom_text || '',
          event_date: customization?.event_date || '',
          custom_image_url: customization?.custom_image_url || '',
        },
      }
    })
    persist(next)
  }

  const removeCustomization = (cartId) => {
    const next = items.map((item) => {
      if (item.cartId !== cartId) return item
      return {
        ...item,
        customization: {
          occasion: '',
          custom_text: '',
          event_date: '',
          custom_image_url: '',
        },
      }
    })
    persist(next)
  }

  const removeItem = (cartId) => {
    const next = items.filter((item) => item.cartId !== cartId)
    persist(next)
  }

  const clearCart = () => {
    persist([])
  }

  const count = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)
  const subtotal = items.reduce(
    (sum, item) => sum + (Number(item.product?.price) || 0) * (Number(item.quantity) || 0),
    0
  )

  const originalSubtotal = items.reduce((sum, item) => {
    const price = Number(item.product?.price) || 0
    const discount = Number(item.product?.discount_percent) || 0
    const original = discount > 0 ? Math.round(price / (1 - discount / 100)) : price
    return sum + original * (Number(item.quantity) || 0)
  }, 0)

  const totalDiscount = Math.max(0, originalSubtotal - subtotal)
  const shippingCharge = 0 // Free shipping
  const total = subtotal + shippingCharge

  const hasMissingRequiredPersonalizations = items.some(itemMissingRequiredPersonalization)

  const value = {
    items,
    count,
    subtotal,
    originalSubtotal,
    totalDiscount,
    shippingCharge,
    total,
    hasMissingRequiredPersonalizations,
    addItem,
    updateQuantity,
    updateCustomization,
    removeCustomization,
    removeItem,
    clearCart,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export const useCart = () => {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}
