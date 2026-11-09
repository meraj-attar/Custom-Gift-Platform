import { createContext, useContext, useEffect, useState } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('customgift_user')) } catch { return null }
  })
  const [loading, setLoading] = useState(Boolean(localStorage.getItem('customgift_token')))

  useEffect(() => {
    const verify = async () => {
      const token = localStorage.getItem('customgift_token')
      if (!token) { setLoading(false); return }
      try {
        const { data } = await api.get('/auth/me')
        setUser(data)
        localStorage.setItem('customgift_user', JSON.stringify(data))
      } catch {
        setUser(null)
      } finally {
        setLoading(false)
      }
    }
    verify()

    const expired = () => { setUser(null); setLoading(false) }
    window.addEventListener('customgift-auth-expired', expired)
    return () => window.removeEventListener('customgift-auth-expired', expired)
  }, [])

  const saveSession = (data) => {
    localStorage.setItem('customgift_token', data.access_token)
    localStorage.setItem('customgift_user', JSON.stringify(data.user))
    setUser(data.user)
  }

  const login = async (payload) => {
    const { data } = await api.post('/auth/login', payload)
    saveSession(data)
    return data.user
  }

  const register = async (payload) => {
    const { data } = await api.post('/auth/register', payload)
    saveSession(data)
    return data.user
  }

  const logout = () => {
    localStorage.removeItem('customgift_token')
    localStorage.removeItem('customgift_user')
    setUser(null)
  }

  const value = { user, loading, login, register, logout, isAdmin: user?.role === 'admin' }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
