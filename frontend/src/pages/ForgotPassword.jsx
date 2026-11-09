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


export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [resetUrl, setResetUrl] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  const submit = async (event) => {
    event.preventDefault()

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

      toast.success(
        'Reset request received'
      )
    } catch (error) {
      toast.error(
        getErrorMessage(error)
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="simple-form-page">
      <form
        className="auth-card narrow"
        onSubmit={submit}
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
          Enter the email address connected
          to your CustomGift account. If an
          active account is registered with
          that email, reset instructions will
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
            autoComplete="email"
            value={email}
            onChange={(event) =>
              setEmail(event.target.value)
            }
            placeholder="you@example.com"
          />
        </label>

        <button
          type="submit"
          className="button button-lg full"
          disabled={busy}
        >
          {busy
            ? 'Sending instructions...'
            : 'Send reset instructions'}
        </button>

        {sent && (
          <div className="success-box">
            <strong>
              Reset request received.
            </strong>

            <span>
              If an active CustomGift account
              is registered with this email,
              password reset instructions will
              be sent to that address.
            </span>

            {resetUrl && (
              <a href={resetUrl}>
                Open development reset link →
              </a>
            )}
          </div>
        )}

        <Link
          className="text-link center"
          to="/login"
        >
          <ArrowLeft size={15} />
          Back to sign in
        </Link>
      </form>
    </div>
  )
}