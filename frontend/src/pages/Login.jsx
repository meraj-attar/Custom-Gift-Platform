import {
  Gift,
  LockKeyhole,
  Mail,
  Sparkles,
} from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'
import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
} from 'react-router-dom'

import { useAuth } from '../context/AuthContext'
import { getErrorMessage } from '../services/api'
import { EMAIL_MAX_LENGTH, validateEmail } from '../utils/validators'

export default function Login() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [form, setForm] = useState({
    email: '',
    password: '',
  })
  const [emailError, setEmailError] = useState(null)
  const [touched, setTouched] = useState(false)
  const [busy, setBusy] = useState(false)

  if (user) {
    return (
      <Navigate
        to={user.role === 'admin' ? '/admin' : '/'}
        replace
      />
    )
  }

  const handleBlurEmail = () => {
    setTouched(true)
    setEmailError(validateEmail(form.email))
  }

  const handleEmailChange = (val) => {
    setForm((prev) => ({ ...prev, email: val }))
    if (touched) {
      setEmailError(validateEmail(val))
    }
  }

  const submit = async (event) => {
    event.preventDefault()

    const err = validateEmail(form.email)
    setEmailError(err)
    setTouched(true)
    if (err) {
      toast.error(err)
      return
    }

    if (!form.password) {
      toast.error('Password is required')
      return
    }

    setBusy(true)

    try {
      const current = await login({
        email: form.email.trim(),
        password: form.password,
      })

      toast.success(`Welcome back, ${current.name.split(' ')[0]}!`)

      navigate(
        location.state?.from || (current.role === 'admin' ? '/admin' : '/'),
      )
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-visual">
        <div>
          <span className="brand-mark large">
            <Gift />
          </span>

          <span className="eyebrow light">
            <Sparkles />
            Meaningful gifting starts here
          </span>

          <h2>
            Create gifts that feel like they were made for one person — because they were.
          </h2>

          <p>
            Personalize photos, messages and dates. Track every order from creation to delivery.
          </p>
        </div>
      </div>

      <div className="auth-form-wrap">
        <form className="auth-card" onSubmit={submit} noValidate>
          <span className="eyebrow">Welcome back</span>
          <h1>Sign in to CustomGift</h1>
          <p>Access your gift bag, orders and saved personalization.</p>

          <label>
            <span>
              <Mail size={16} />
              Email address
            </span>

            <input
              type="email"
              required
              maxLength={EMAIL_MAX_LENGTH}
              autoComplete="email"
              value={form.email}
              onBlur={handleBlurEmail}
              onChange={(e) => handleEmailChange(e.target.value)}
              placeholder="you@example.com"
            />
            {touched && emailError && <small className="field-error">{emailError}</small>}
          </label>

          <label>
            <span>
              <LockKeyhole size={16} />
              Password
            </span>

            <input
              type="password"
              required
              maxLength={128}
              autoComplete="current-password"
              value={form.password}
              onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
              placeholder="••••••••"
            />
          </label>

          <div className="form-between">
            <span />
            <Link to="/forgot-password">Forgot password?</Link>
          </div>

          <button className="button button-lg full" disabled={busy}>
            {busy ? 'Signing in...' : 'Sign in'}
          </button>

          <p className="auth-switch">
            New here? <Link to="/register">Create an account</Link>
          </p>

          <div className="demo-note">
            <strong>Demo admin</strong>
            <span>admin@customgift.dev / Admin@123</span>
          </div>
        </form>
      </div>
    </div>
  )
}
