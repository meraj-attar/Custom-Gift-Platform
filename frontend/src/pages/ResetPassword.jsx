import {
  ArrowLeft,
  LockKeyhole,
} from 'lucide-react'

import { useState } from 'react'

import toast from 'react-hot-toast'

import {
  Link,
  useNavigate,
  useSearchParams,
} from 'react-router-dom'

import api, {
  getErrorMessage,
} from '../services/api'


export default function ResetPassword() {
  const [params] =
    useSearchParams()

  const navigate =
    useNavigate()

  const token =
    params.get('token') || ''

  const [
    password,
    setPassword,
  ] = useState('')

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState('')

  const [
    busy,
    setBusy,
  ] = useState(false)

  const submit = async (event) => {
    event.preventDefault()

    if (!token) {
      toast.error(
        'Invalid password reset link'
      )
      return
    }

    if (
      password
      !== confirmPassword
    ) {
      toast.error(
        'Passwords do not match'
      )
      return
    }

    if (password.length < 8) {
      toast.error(
        'Password must be at least 8 characters'
      )
      return
    }

    if (!/[A-Z]/.test(password)) {
      toast.error(
        'Password must include an uppercase letter'
      )
      return
    }

    if (!/[a-z]/.test(password)) {
      toast.error(
        'Password must include a lowercase letter'
      )
      return
    }

    if (!/[0-9]/.test(password)) {
      toast.error(
        'Password must include a number'
      )
      return
    }

    setBusy(true)

    try {
      await api.post('/auth/reset-password', {
        reset_token: token,
        new_password: password,
        confirm_password: confirmPassword,
      })

      toast.success(
        'Password updated successfully. Please sign in.',
      )

      navigate(
        '/login',
        {
          replace: true,
        },
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
          <LockKeyhole />
        </span>

        <span className="eyebrow">
          Secure password reset
        </span>

        <h1>
          Create a new password
        </h1>

        {token ? (
          <>
            <p>
              Enter your new password and
              confirm it below. Use at least
              8 characters with uppercase,
              lowercase and a number.
            </p>

            <label>
              New password

              <input
                type="password"
                minLength="8"
                maxLength="128"
                required
                autoComplete="new-password"
                value={password}
                onChange={(event) =>
                  setPassword(
                    event.target.value
                  )
                }
                placeholder="Enter new password"
              />
            </label>

            <label>
              Confirm password

              <input
                type="password"
                minLength="8"
                maxLength="128"
                required
                autoComplete="new-password"
                value={
                  confirmPassword
                }
                onChange={(event) =>
                  setConfirmPassword(
                    event.target.value
                  )
                }
                placeholder="Confirm new password"
              />
            </label>

            <button
              type="submit"
              className="button button-lg full"
              disabled={busy}
            >
              {busy
                ? 'Updating password...'
                : 'Reset password'}
            </button>
          </>
        ) : (
          <div className="error-box">
            <strong>
              Invalid reset link.
            </strong>

            <span>
              This page needs a valid
              password reset token.
              Request a new reset link
              and try again.
            </span>
          </div>
        )}

        {!token && (
          <Link
            className="button button-lg full"
            to="/forgot-password"
          >
            Request a new reset link
          </Link>
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