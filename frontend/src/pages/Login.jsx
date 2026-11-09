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


export default function Login() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [form, setForm] = useState({
    email: '',
    password: '',
  })

  const [busy, setBusy] = useState(false)

  if (user) {
    return (
      <Navigate
        to={
          user.role === 'admin'
            ? '/admin'
            : '/'
        }
        replace
      />
    )
  }

  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)

    try {
      const current = await login({
        email: form.email.trim(),
        password: form.password,
      })

      toast.success(
        `Welcome back, ${
          current.name.split(' ')[0]
        }!`,
      )

      navigate(
        location.state?.from ||
          (
            current.role === 'admin'
              ? '/admin'
              : '/'
          ),
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
            Create gifts that feel like they
            were made for one person —
            because they were.
          </h2>

          <p>
            Personalize photos, messages and
            dates. Track every order from
            creation to delivery.
          </p>
        </div>
      </div>

      <div className="auth-form-wrap">
        <form
          className="auth-card"
          onSubmit={submit}
        >
          <span className="eyebrow">
            Welcome back
          </span>

          <h1>
            Sign in to CustomGift
          </h1>

          <p>
            Access your gift bag, orders and
            saved personalization.
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
              value={form.email}
              onChange={(event) =>
                setForm({
                  ...form,
                  email:
                    event.target.value,
                })
              }
              placeholder="you@example.com"
            />
          </label>

          <label>
            <span>
              <LockKeyhole size={16} />
              Password
            </span>

            <input
              type="password"
              required
              autoComplete="current-password"
              value={form.password}
              onChange={(event) =>
                setForm({
                  ...form,
                  password:
                    event.target.value,
                })
              }
              placeholder="••••••••"
            />
          </label>

          <div className="form-between">
            <span />

            <Link to="/forgot-password">
              Forgot password?
            </Link>
          </div>

          <button
            className="button button-lg full"
            disabled={busy}
          >
            {busy
              ? 'Signing in...'
              : 'Sign in'}
          </button>

          <p className="auth-switch">
            New here?{' '}
            <Link to="/register">
              Create an account
            </Link>
          </p>

          <div className="demo-note">
            <strong>
              Demo admin
            </strong>

            <span>
              admin@customgift.dev /
              Admin@123
            </span>
          </div>
        </form>
      </div>
    </div>
  )
}