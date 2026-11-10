import {
  ArrowLeft,
  Mail,
  ShieldCheck,
} from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'

import api, {
  getErrorMessage,
} from '../services/api'
import { EMAIL_MAX_LENGTH, validateEmail } from '../utils/validators'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState(null)
  const [touched, setTouched] = useState(false)
  const [resetUrl, setResetUrl] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  const handleBlurEmail = () => {
    setTouched(true)
    setEmailError(validateEmail(email))
  }

  const handleEmailChange = (val) => {
    setEmail(val)
    if (touched) {
      setEmailError(validateEmail(val))
    }
  }

  const submit = async (event) => {
    event.preventDefault()

    const err = validateEmail(email)
    setEmailError(err)
    setTouched(true)
    if (err) {
      toast.error(err)
      return
    }

    setBusy(true)
    setSent(false)
    setResetUrl('')

    try {
      const { data } = await api.post(
        '/auth/forgot-password',
        {
          email: email.trim(),
        },
      )

      setSent(true)
      setResetUrl(data.reset_url || '')

      toast.success('Reset request received')
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="simple-form-page">
      <form
        className="auth-card narrow"
        onSubmit={submit}
        noValidate
      >
        <span className="icon-bubble">
          <ShieldCheck />
        </span>

        <span className="eyebrow">
          Account recovery
        </span>

        <h1>
          Forgot your password?
        </h1>

        <p>
          Enter the email address connected to your CustomGift account. If an
          active account is registered with that email, reset instructions will
          be sent to that address.
        </p>

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
            value={email}
            onBlur={handleBlurEmail}
            onChange={(event) => handleEmailChange(event.target.value)}
            placeholder="you@example.com"
          />
          {touched && emailError && <small className="field-error">{emailError}</small>}
        </label>

        <button
          type="submit"
          className="button button-lg full"
          disabled={busy}
        >
          {busy ? 'Sending link...' : 'Send reset instructions'}
        </button>

        {sent && (
          <div className="reset-confirmation">
            <p>
              If an account is associated with this email, we have sent a reset link.
              Please check your inbox.
            </p>
            {resetUrl && (
              <div className="dev-reset-link">
                <small>Development shortcut:</small>
                <a href={resetUrl}>Open reset link</a>
              </div>
            )}
          </div>
        )}

        <p className="auth-switch">
          <Link to="/login">
            <ArrowLeft size={16} /> Back to sign in
          </Link>
        </p>
      </form>
    </div>
  )
}
