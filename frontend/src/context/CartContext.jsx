import { createContext, useContext, useState } from 'react'

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem('customgift_cart')) || [] } catch { return [] }
  })

  const persist = (next) => {
    setItems(next)
    localStorage.setItem('customgift_cart', JSON.stringify(next))
  }

  const addItem = (item) => {
    const id = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`
    persist([...items, { ...item, cartId: id }])
  }
  const updateQuantity = (cartId, quantity) => persist(items.map((item) => item.cartId === cartId ? { ...item, quantity: Math.max(1, Math.min(10, quantity)) } : item))
  const removeItem = (cartId) => persist(items.filter((item) => item.cartId !== cartId))
  const clearCart = () => persist([])

  const count = items.reduce((sum, item) => sum + item.quantity, 0)
  const total = items.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0)

  const value = { items, count, total, addItem, updateQuantity, removeItem, clearCart }
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export const useCart = () => useContext(CartContext)
