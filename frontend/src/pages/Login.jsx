import {
  Eye,
  EyeOff,
  Gift,
  Heart,
  LockKeyhole,
  Mail,
  ShieldCheck,
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
import { useCart } from '../context/CartContext'
import { getErrorMessage } from '../services/api'
import {
  EMAIL_MAX_LENGTH,
  PASSWORD_MAX_LENGTH,
  validateEmail,
  validateLoginPassword,
} from '../utils/validators'

export default function Login() {
  const { user, login } = useAuth()
  const { addItem } = useCart()
  const navigate = useNavigate()
  const location = useLocation()

  // Form fields strictly empty by default (no prefilled or dummy credentials)
  const [form, setForm] = useState({
    email: '',
    password: '',
  })
  const [errors, setErrors] = useState({
    email: null,
    password: null,
  })
  const [touched, setTouched] = useState({
    email: false,
    password: false,
  })
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)

  if (user) {
    return (
      <Navigate
        to={user.role === 'admin' ? '/admin' : '/'}
        replace
      />
    )
  }

  const validateField = (field, value) => {
    if (field === 'email') return validateEmail(value)
    if (field === 'password') return validateLoginPassword(value)
    return null
  }

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }))
    const error = validateField(field, form[field])
    setErrors((prev) => ({ ...prev, [field]: error }))
  }

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (touched[field]) {
      const error = validateField(field, value)
      setErrors((prev) => ({ ...prev, [field]: error }))
    }
  }

  const submit = async (event) => {
    event.preventDefault()
    if (busy) return

    const emailErr = validateEmail(form.email)
    const passwordErr = validateLoginPassword(form.password)

    setErrors({
      email: emailErr,
      password: passwordErr,
    })
    setTouched({
      email: true,
      password: true,
    })

    if (emailErr || passwordErr) {
      if (emailErr) {
        toast.error(emailErr)
      } else if (passwordErr) {
        toast.error(passwordErr)
      }
      return
    }

    setBusy(true)

    try {
      const current = await login({
        email: form.email.trim(),
        password: form.password,
      })

      const firstName = current?.name ? current.name.split(' ')[0] : 'there'
      toast.success(`Welcome back, ${firstName}!`)

      const orderNowItem = location.state?.orderNowItem
      if (orderNowItem) {
        addItem(orderNowItem)
      }

      const redirectTarget = location.state?.from || (current.role === 'admin' ? '/admin' : '/')
      navigate(redirectTarget, { replace: true })
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-visual">
        <div className="auth-visual-inner">
          <div className="auth-brand-badge">
            <span className="brand-mark large">
              <Gift size={24} />
            </span>
            <span className="auth-brand-title">CustomGift</span>
          </div>

          <div className="auth-visual-content">
            <span className="eyebrow light">
              <Sparkles size={14} /> Meaningful gifting starts here
            </span>

            <h2>
              Create gifts that feel like they were made for one person — because they were.
            </h2>

            <p>
              Personalize photos, messages and dates. Track every order from creation to delivery.
            </p>

            <div className="auth-trust-pills">
              <span><Sparkles size={13} /> Real-Time Live Preview</span>
              <span><Heart size={13} /> Handcrafted Keepsakes</span>
              <span><ShieldCheck size={13} /> Secure Checkout</span>
            </div>
          </div>
        </div>
      </div>

      <div className="auth-form-wrap">
        <form
          className="auth-card"
          onSubmit={submit}
          noValidate
          aria-label="Sign in to CustomGift"
        >
          <span className="eyebrow">Welcome back</span>
          <h1>Sign in to CustomGift</h1>
          <p className="auth-subtitle">Access your gift bag, orders and saved personalization.</p>

          <label htmlFor="login-email">
            <span className="field-label-text">
              <Mail size={16} /> Email address
            </span>

            <input
              id="login-email"
              name="email"
              type="email"
              required
              maxLength={EMAIL_MAX_LENGTH}
              autoComplete="email"
              value={form.email}
              aria-invalid={Boolean(touched.email && errors.email)}
              aria-describedby={touched.email && errors.email ? 'login-email-error' : undefined}
              onBlur={() => handleBlur('email')}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="you@example.com"
            />
            {touched.email && errors.email && (
              <small id="login-email-error" className="field-error" role="alert">
                {errors.email}
              </small>
            )}
          </label>

          <label htmlFor="login-password">
            <span className="field-label-text">
              <LockKeyhole size={16} /> Password
            </span>

            <div className="password-input-wrap">
              <input
                id="login-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                maxLength={PASSWORD_MAX_LENGTH}
                autoComplete="current-password"
                value={form.password}
                aria-invalid={Boolean(touched.password && errors.password)}
                aria-describedby={touched.password && errors.password ? 'login-password-error' : undefined}
                onBlur={() => handleBlur('password')}
                onChange={(e) => handleChange('password', e.target.value)}
                placeholder="Enter your password"
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {touched.password && errors.password && (
              <small id="login-password-error" className="field-error" role="alert">
                {errors.password}
              </small>
            )}
          </label>

          <div className="form-between">
            <span />
            <Link to="/forgot-password" className="forgot-password-link">Forgot password?</Link>
          </div>

          <button
            type="submit"
            className="button button-lg full auth-submit-btn"
            disabled={busy}
            aria-busy={busy}
          >
            {busy ? (
              <>
                <span className="button-spinner" aria-hidden="true" />
                Signing in...
              </>
            ) : (
              'Sign in'
            )}
          </button>

          <p className="auth-switch">
            New here? <Link to="/register">Create an account</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
