import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const navigate = useNavigate()
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('customgift_user'))
    } catch {
      return null
    }
  })
  const [loading, setLoading] = useState(Boolean(localStorage.getItem('customgift_token')))
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const triggerElementRef = useRef(null)

  useEffect(() => {
    const verify = async () => {
      const token = localStorage.getItem('customgift_token')
      if (!token) {
        setLoading(false)
        return
      }
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

    const expired = () => {
      setUser(null)
      setLoading(false)
    }
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
    return { ...data.user, ...data, user: data.user }
  }

  const openSignOutModal = useCallback((triggerElement = null) => {
    triggerElementRef.current = triggerElement || (typeof document !== 'undefined' ? document.activeElement : null)
    setIsSignOutModalOpen(true)
  }, [])

  const closeSignOutModal = useCallback(() => {
    if (isSigningOut) return
    setIsSignOutModalOpen(false)
    if (triggerElementRef.current && typeof triggerElementRef.current.focus === 'function') {
      try {
        triggerElementRef.current.focus()
      } catch {}
    }
  }, [isSigningOut])

  const confirmSignOut = useCallback(async () => {
    if (isSigningOut) return
    setIsSigningOut(true)
    try {
      localStorage.removeItem('customgift_token')
      localStorage.removeItem('customgift_user')
      setUser(null)
      setIsSignOutModalOpen(false)
      toast.success('Signed out successfully')
      navigate('/')
    } catch {
      toast.error('Failed to sign out. Please try again.')
    } finally {
      setIsSigningOut(false)
    }
  }, [isSigningOut, navigate])

  const logout = useCallback(() => {
    localStorage.removeItem('customgift_token')
    localStorage.removeItem('customgift_user')
    setUser(null)
    navigate('/')
  }, [navigate])

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    openSignOutModal,
    closeSignOutModal,
    confirmSignOut,
    isSignOutModalOpen,
    isSigningOut,
    isAdmin: user?.role === 'admin',
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
