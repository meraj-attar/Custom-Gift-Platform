import { Gift, LockKeyhole, Mail, MapPin, Phone, Sparkles, UserRound } from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getErrorMessage } from '../services/api'
import {
  ADDRESS_MAX_LENGTH,
  EMAIL_MAX_LENGTH,
  NAME_MAX_LENGTH,
  PHONE_MAX_LENGTH,
  validateEmail,
  validatePassword,
  validatePhone,
  validateText,
} from '../utils/validators'

export default function Register() {
  const { user, register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', address: '' })
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to="/" replace />

  const validateField = (key, value) => {
    switch (key) {
      case 'name':
        return validateText(value, 'Full name', 2, NAME_MAX_LENGTH, true)
      case 'email':
        return validateEmail(value)
      case 'password':
        return validatePassword(value)
      case 'phone':
        return validatePhone(value, false)
      case 'address':
        return value ? validateText(value, 'Address', 5, ADDRESS_MAX_LENGTH, false) : null
      default:
        return null
    }
  }

  const handleBlur = (key) => {
    setTouched((prev) => ({ ...prev, [key]: true }))
    const err = validateField(key, form[key])
    setErrors((prev) => ({ ...prev, [key]: err }))
  }

  const field = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (touched[key]) {
      const err = validateField(key, value)
      setErrors((prev) => ({ ...prev, [key]: err }))
    }
  }

  const submit = async (e) => {
    e.preventDefault()

    // Run all validations
    const nextErrors = {
      name: validateField('name', form.name),
      email: validateField('email', form.email),
      password: validateField('password', form.password),
      phone: validateField('phone', form.phone),
      address: form.address ? validateField('address', form.address) : null,
    }

    setErrors(nextErrors)
    setTouched({ name: true, email: true, password: true, phone: true, address: true })

    const hasError = Object.values(nextErrors).some(Boolean)
    if (hasError) {
      toast.error('Please fix the errors in the form before submitting')
      return
    }

    setBusy(true)
    try {
      await register({
        ...form,
        email: form.email.trim(),
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
      })
      toast.success('Your account is ready')
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
          <span className="brand-mark large"><Gift /></span>
          <span className="eyebrow light"><Sparkles /> Start creating</span>
          <h2>A little personalization turns a nice gift into their gift.</h2>
          <p>Create your account to upload private photos, personalize products and track every order.</p>
        </div>
      </div>
      <div className="auth-form-wrap">
        <form className="auth-card" onSubmit={submit} noValidate>
          <span className="eyebrow">Join CustomGift</span>
          <h1>Create your account</h1>
          <div className="form-grid two">
            <label>
              <span><UserRound size={16} /> Full name</span>
              <input
                required
                maxLength={NAME_MAX_LENGTH}
                value={form.name}
                onBlur={() => handleBlur('name')}
                onChange={(e) => field('name', e.target.value)}
                placeholder="Your full name"
              />
              {touched.name && errors.name && <small className="field-error">{errors.name}</small>}
            </label>
            <label>
              <span><Phone size={16} /> Phone (optional)</span>
              <input
                type="tel"
                maxLength={PHONE_MAX_LENGTH}
                value={form.phone}
                onBlur={() => handleBlur('phone')}
                onChange={(e) => field('phone', e.target.value)}
                placeholder="10-digit mobile"
              />
              {touched.phone && errors.phone && <small className="field-error">{errors.phone}</small>}
            </label>
          </div>
          <label>
            <span><Mail size={16} /> Email</span>
            <input
              type="email"
              required
              maxLength={EMAIL_MAX_LENGTH}
              value={form.email}
              onBlur={() => handleBlur('email')}
              onChange={(e) => field('email', e.target.value)}
              placeholder="you@example.com"
            />
            {touched.email && errors.email && <small className="field-error">{errors.email}</small>}
          </label>
          <label>
            <span><LockKeyhole size={16} /> Password</span>
            <input
              type="password"
              minLength="8"
              maxLength="128"
              required
              value={form.password}
              onBlur={() => handleBlur('password')}
              onChange={(e) => field('password', e.target.value)}
              placeholder="Uppercase, lowercase & number"
            />
            {touched.password && errors.password && <small className="field-error">{errors.password}</small>}
          </label>
          <label>
            <span><MapPin size={16} /> Address (optional)</span>
            <textarea
              maxLength={ADDRESS_MAX_LENGTH}
              value={form.address}
              onBlur={() => handleBlur('address')}
              onChange={(e) => field('address', e.target.value)}
              placeholder="Shipping address"
            />
            {touched.address && errors.address && <small className="field-error">{errors.address}</small>}
          </label>
          <button className="button button-lg full" disabled={busy}>
            {busy ? 'Creating account...' : 'Create account'}
          </button>
          <p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
        </form>
      </div>
    </div>
  )
}
