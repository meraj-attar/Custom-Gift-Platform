import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import api from '../services/api'
import { useAuth } from './AuthContext'

const WishlistContext = createContext(null)

export function WishlistProvider({ children }) {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [pendingIds, setPendingIds] = useState([])

  const refresh = async () => {
    if (!user) {
      setItems([])
      return []
    }
    setLoading(true)
    try {
      const { data } = await api.get('/wishlist')
      setItems(data)
      return data
    } finally {
      setLoading(false)
    }
  }

  const userId = user?.id

  useEffect(() => {
    if (!userId) {
      setItems([])
      setPendingIds([])
      return
    }

    let active = true
    setLoading(true)
    api.get('/wishlist')
      .then(({ data }) => { if (active) setItems(data) })
      .catch(() => { if (active) setItems([]) })
      .finally(() => { if (active) setLoading(false) })

    return () => { active = false }
  }, [userId])

  const ids = useMemo(() => new Set(items.map((item) => item.id)), [items])
  const isWishlisted = (productId) => ids.has(productId)
  const isPending = (productId) => pendingIds.includes(productId)

  const markPending = (productId, pending) => {
    setPendingIds((current) => pending
      ? [...new Set([...current, productId])]
      : current.filter((id) => id !== productId))
  }

  const add = async (product) => {
    if (!user || isPending(product.id)) return
    markPending(product.id, true)
    try {
      const { data } = await api.post(`/wishlist/${product.id}`)
      setItems((current) => current.some((item) => item.id === data.id) ? current : [data, ...current])
      return data
    } finally {
      markPending(product.id, false)
    }
  }

  const remove = async (productId) => {
    if (!user || isPending(productId)) return
    markPending(productId, true)
    try {
      await api.delete(`/wishlist/${productId}`)
      setItems((current) => current.filter((item) => item.id !== productId))
    } finally {
      markPending(productId, false)
    }
  }

  const toggle = async (product) => {
    if (isWishlisted(product.id)) {
      await remove(product.id)
      return false
    }
    await add(product)
    return true
  }

  const value = {
    items,
    count: items.length,
    loading,
    refresh,
    add,
    remove,
    toggle,
    isWishlisted,
    isPending,
  }

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
}

export const useWishlist = () => useContext(WishlistContext)
