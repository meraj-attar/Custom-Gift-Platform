import {
  Eye,
  EyeOff,
  Gift,
  LockKeyhole,
  Mail,
  MapPin,
  Phone,
  Sparkles,
  UserRound,
} from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { Link, Navigate, useNavigate } from 'react-router-dom'

import PasswordStrengthMeter from '../components/PasswordStrengthMeter'
import { useAuth } from '../context/AuthContext'
import { getErrorMessage } from '../services/api'
import {
  ADDRESS_MAX_LENGTH,
  EMAIL_MAX_LENGTH,
  NAME_MAX_LENGTH,
  PASSWORD_MAX_LENGTH,
  PHONE_MAX_LENGTH,
  normalizePhone,
  validateAddress,
  validateEmail,
  validateFullName,
  validatePassword,
  validatePhone,
} from '../utils/validators'

export default function Register() {
  const { user, register } = useAuth()
  const navigate = useNavigate()

  // Form fields strictly empty by default (no prefilled or dummy data)
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    address: '',
  })
  const [errors, setErrors] = useState({
    name: null,
    email: null,
    password: null,
    phone: null,
    address: null,
  })
  const [touched, setTouched] = useState({
    name: false,
    email: false,
    password: false,
    phone: false,
    address: false,
  })
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to="/" replace />

  const validateField = (key, value) => {
    switch (key) {
      case 'name':
        return validateFullName(value)
      case 'email':
        return validateEmail(value)
      case 'password':
        return validatePassword(value)
      case 'phone':
        return validatePhone(value, false)
      case 'address':
        return validateAddress(value, false)
      default:
        return null
    }
  }

  const handleBlur = (key) => {
    setTouched((prev) => ({ ...prev, [key]: true }))
    const err = validateField(key, form[key])
    setErrors((prev) => ({ ...prev, [key]: err }))
  }

  const handleFieldChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (touched[key]) {
      const err = validateField(key, value)
      setErrors((prev) => ({ ...prev, [key]: err }))
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return

    // Run all validations
    const nextErrors = {
      name: validateField('name', form.name),
      email: validateField('email', form.email),
      password: validateField('password', form.password),
      phone: validateField('phone', form.phone),
      address: validateField('address', form.address),
    }

    setErrors(nextErrors)
    setTouched({
      name: true,
      email: true,
      password: true,
      phone: true,
      address: true,
    })

    const hasError = Object.values(nextErrors).some(Boolean)
    if (hasError) {
      const firstErrorMessage = Object.values(nextErrors).find(Boolean)
      toast.error(firstErrorMessage || 'Please fix the errors in the form before submitting')
      return
    }

    setBusy(true)

    try {
      const normalizedPhone = form.phone.trim() ? normalizePhone(form.phone) : null
      await register({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password, // Never trim password
        phone: normalizedPhone,
        address: form.address.trim() || null,
      })
      toast.success('Your account is ready! Welcome to CustomGift.')
      navigate('/')
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-visual register-visual">
        <div>
          <span className="brand-mark large">
            <Gift size={28} />
          </span>
          <span className="eyebrow light">
            <Sparkles size={14} /> Start creating
          </span>
          <h2>A little personalization turns a nice gift into their gift.</h2>
          <p>
            Create your account to upload private photos, personalize products and track every order from creation to delivery.
          </p>
        </div>
      </div>

      <div className="auth-form-wrap">
        <form
          className="auth-card"
          onSubmit={submit}
          noValidate
          aria-label="Create your CustomGift account"
        >
          <span className="eyebrow">Join CustomGift</span>
          <h1>Create your account</h1>
          <p>Start personalizing memorable gifts for the people who matter most.</p>

          <div className="form-grid two">
            <label htmlFor="register-name">
              <span>
                <UserRound size={16} /> Full name
              </span>
              <input
                id="register-name"
                name="name"
                type="text"
                required
                maxLength={NAME_MAX_LENGTH}
                autoComplete="name"
                value={form.name}
                aria-invalid={Boolean(touched.name && errors.name)}
                aria-describedby={touched.name && errors.name ? 'register-name-error' : undefined}
                onBlur={() => handleBlur('name')}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                placeholder="e.g. Aarav Sharma"
              />
              {touched.name && errors.name && (
                <small id="register-name-error" className="field-error" role="alert">
                  {errors.name}
                </small>
              )}
            </label>

            <label htmlFor="register-phone">
              <span>
                <Phone size={16} /> Phone (optional)
              </span>
              <input
                id="register-phone"
                name="phone"
                type="tel"
                maxLength={PHONE_MAX_LENGTH}
                autoComplete="tel"
                value={form.phone}
                aria-invalid={Boolean(touched.phone && errors.phone)}
                aria-describedby={touched.phone && errors.phone ? 'register-phone-error' : undefined}
                onBlur={() => handleBlur('phone')}
                onChange={(e) => handleFieldChange('phone', e.target.value)}
                placeholder="10-digit mobile (+91)"
              />
              {touched.phone && errors.phone && (
                <small id="register-phone-error" className="field-error" role="alert">
                  {errors.phone}
                </small>
              )}
            </label>
          </div>

          <label htmlFor="register-email">
            <span>
              <Mail size={16} /> Email
            </span>
            <input
              id="register-email"
              name="email"
              type="email"
              required
              maxLength={EMAIL_MAX_LENGTH}
              autoComplete="email"
              value={form.email}
              aria-invalid={Boolean(touched.email && errors.email)}
              aria-describedby={touched.email && errors.email ? 'register-email-error' : undefined}
              onBlur={() => handleBlur('email')}
              onChange={(e) => handleFieldChange('email', e.target.value)}
              placeholder="you@example.com"
            />
            {touched.email && errors.email && (
              <small id="register-email-error" className="field-error" role="alert">
                {errors.email}
              </small>
            )}
          </label>

          <label htmlFor="register-password">
            <span>
              <LockKeyhole size={16} /> Password
            </span>
            <div className="password-input-wrap">
              <input
                id="register-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                minLength={8}
                maxLength={PASSWORD_MAX_LENGTH}
                required
                autoComplete="new-password"
                value={form.password}
                aria-invalid={Boolean(touched.password && errors.password)}
                aria-describedby={touched.password && errors.password ? 'register-password-error' : 'register-password-hint'}
                onBlur={() => handleBlur('password')}
                onChange={(e) => handleFieldChange('password', e.target.value)}
                placeholder="At least 8 characters (upper, lower, number)"
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
            {touched.password && errors.password ? (
              <small id="register-password-error" className="field-error" role="alert">
                {errors.password}
              </small>
            ) : (
              <small id="register-password-hint" className="field-hint" style={{ color: 'var(--muted)', fontSize: '11px', marginTop: '2px' }}>
                Must be 8–128 characters, with at least one uppercase letter, one lowercase letter, and one number.
              </small>
            )}
            <PasswordStrengthMeter password={form.password} />
          </label>

          <label htmlFor="register-address">
            <span>
              <MapPin size={16} /> Address (optional)
            </span>
            <textarea
              id="register-address"
              name="address"
              maxLength={ADDRESS_MAX_LENGTH}
              autoComplete="street-address"
              value={form.address}
              aria-invalid={Boolean(touched.address && errors.address)}
              aria-describedby={touched.address && errors.address ? 'register-address-error' : undefined}
              onBlur={() => handleBlur('address')}
              onChange={(e) => handleFieldChange('address', e.target.value)}
              placeholder="House/flat number, street, landmark, city"
              rows={3}
            />
            {touched.address && errors.address && (
              <small id="register-address-error" className="field-error" role="alert">
                {errors.address}
              </small>
            )}
          </label>

          <button
            type="submit"
            className="button button-lg full"
            disabled={busy}
            aria-busy={busy}
          >
            {busy ? (
              <>
                <span className="button-spinner" aria-hidden="true" />
                Creating account...
              </>
            ) : (
              'Create account'
            )}
          </button>

          <p className="auth-switch">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
