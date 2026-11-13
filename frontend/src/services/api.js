import axios from 'axios'

export const API_URL = import.meta.env.VITE_API_URL || '/api'
export const API_ORIGIN = API_URL.replace(/\/api\/?$/, '')

const api = axios.create({
  baseURL: API_URL,
  timeout: 20000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('customgift_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If receiving 401 on an authenticated endpoint, clean up and notify session expiration
    if (error.response?.status === 401) {
      const isLoginRequest = error.config?.url?.includes('/auth/login')
      if (!isLoginRequest) {
        localStorage.removeItem('customgift_token')
        localStorage.removeItem('customgift_user')
        window.dispatchEvent(new Event('customgift-auth-expired'))
      }
    }
    return Promise.reject(error)
  },
)

export const getErrorMessage = (error) => {
  if (!error.response) {
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return 'Request timed out. The server took too long to respond. Please try again.'
    }
    return 'Unable to connect to the server. Please check your internet connection or try again shortly.'
  }

  const data = error.response.data
  const status = error.response.status

  // If HTTP 500, never return raw "Internal Server Error"
  if (status >= 500) {
    return 'We encountered a temporary server error. Please try again shortly or contact support if the issue persists.'
  }

  // Parse structured FastAPI validation errors (422)
  if (status === 422 && data) {
    if (Array.isArray(data.detail)) {
      return data.detail.map((item) => item.msg || item).join(', ')
    }
    if (typeof data.detail === 'string') {
      return data.detail
    }
  }

  const detail = data?.detail
  if (Array.isArray(detail)) return detail.map((item) => item.msg || item).join(', ')
  if (typeof detail === 'string') return detail
  if (typeof data?.message === 'string') return data.message
  if (typeof data === 'string' && data.trim() && data.trim() !== 'Internal Server Error') return data

  if (status === 400) return data?.detail || 'Invalid request. Please check your information and try again.'
  if (status === 401) return 'Your session has expired. Please sign in again.'
  if (status === 403) return 'You do not have permission to perform this action.'
  if (status === 404) return data?.detail || 'The requested resource was not found.'
  if (status === 409) return data?.detail || 'This action could not be completed due to a conflict.'

  return 'Something went wrong. Please try again.'
}

export const resolveImageUrl = (url) => {
  if (!url) return '/products/gift1.jpg'
  if (/^https?:\/\//i.test(url)) return url
  if (url.startsWith('/media/')) return `${API_ORIGIN}${url}`
  return url
}

export default api
