import axios from 'axios'

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
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
    if (error.response?.status === 401) {
      localStorage.removeItem('customgift_token')
      localStorage.removeItem('customgift_user')
      window.dispatchEvent(new Event('customgift-auth-expired'))
    }
    return Promise.reject(error)
  },
)

export const getErrorMessage = (error) => {
  const detail = error.response?.data?.detail
  if (Array.isArray(detail)) return detail.map((item) => item.msg).join(', ')
  return detail || error.response?.data?.message || error.message || 'Something went wrong'
}

export const resolveImageUrl = (url) => {
  if (!url) return '/products/gift1.jpg'
  if (/^https?:\/\//i.test(url)) return url
  if (url.startsWith('/media/')) return `${API_ORIGIN}${url}`
  return url
}

export default api
