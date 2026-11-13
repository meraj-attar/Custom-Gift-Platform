import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { Link, useNavigate } from 'react-router-dom'

import PasswordStrengthMeter from '../components/PasswordStrengthMeter'
import api, { getErrorMessage } from '../services/api'
import {
  EMAIL_MAX_LENGTH,
  PASSWORD_MAX_LENGTH,
  validateEmail,
  validatePassword,
} from '../utils/validators'

// Mask email for privacy (e.g. merajattar20@gmail.com -> m*********0@gmail.com)
function maskEmail(emailStr) {
  if (!emailStr || typeof emailStr !== 'string' || !emailStr.includes('@')) {
    return emailStr || ''
  }
  const [local, domain] = emailStr.split('@')
  if (local.length <= 2) {
    return `${local[0]}*@${domain}`
  }
  const first = local[0]
  const last = local[local.length - 1]
  const maskedLocal = first + '*'.repeat(Math.max(3, local.length - 2)) + last
  return `${maskedLocal}@${domain}`
}

export default function ForgotPassword() {
  const navigate = useNavigate()

  // Step indicator: 1 = Email, 2 = Verify OTP, 3 = New Password, 4 = Complete
  const [step, setStep] = useState(1)

  // Step 1: Email Form State
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState(null)
  const [touchedEmail, setTouchedEmail] = useState(false)

  // Step 2: 6-Digit OTP State
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [otpError, setOtpError] = useState(null)
  const [resendCooldown, setResendCooldown] = useState(60)
  const [expirySeconds, setExpirySeconds] = useState(300) // Exactly 5 minutes (300 seconds)
  const inputRefs = useRef([])

  // Step 3: Password Reset State
  const [resetToken, setResetToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState(null)
  const [confirmError, setConfirmError] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [touchedPassword, setTouchedPassword] = useState({
    password: false,
    confirm: false,
  })

  const [busy, setBusy] = useState(false)

  // -------------------------------------------------------------
  // Timers for Step 2 (Independent Expiration & Cooldown)
  // -------------------------------------------------------------
  useEffect(() => {
    let timer
    if (step === 2) {
      timer = setInterval(() => {
        setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0))
        setExpirySeconds((prev) => (prev > 0 ? prev - 1 : 0))
      }, 1000)
    }
    return () => clearInterval(timer)
  }, [step])

  // Focus the first OTP box when entering Step 2
  useEffect(() => {
    if (step === 2 && inputRefs.current[0]) {
      setTimeout(() => {
        inputRefs.current[0]?.focus()
      }, 100)
    }
  }, [step])

  const formatTime = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60)
    const secs = totalSeconds % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  // -------------------------------------------------------------
  // Step 1 Handlers: Email Submission
  // -------------------------------------------------------------
  const handleEmailChange = (val) => {
    setEmail(val)
    if (touchedEmail) {
      setEmailError(validateEmail(val))
    }
  }

  const handleRequestOtp = async (e) => {
    e.preventDefault()
    if (busy) return

    const err = validateEmail(email)
    setEmailError(err)
    setTouchedEmail(true)

    if (err) {
      toast.error(err)
      return
    }

    setBusy(true)

    try {
      const { data } = await api.post('/auth/forgot-password', {
        email: email.trim().toLowerCase(),
      })

      setResendCooldown(data.cooldown_seconds || 60)
      setExpirySeconds(300) // Reset to fresh 5 minutes
      setOtp(['', '', '', '', '', ''])
      setOtpError(null)
      setStep(2)

      toast.success(data.message || 'If an account exists with this email, verification instructions have been sent.')
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  // -------------------------------------------------------------
  // Step 2 Handlers: OTP Inputs, Auto-advance, Paste & Resend
  // -------------------------------------------------------------
  const handleOtpBoxChange = (index, value) => {
    const cleaned = value.replace(/\D/g, '')
    if (!cleaned) {
      const newOtp = [...otp]
      newOtp[index] = ''
      setOtp(newOtp)
      return
    }

    // Support multi-digit pasting or mobile autofill into an individual box
    if (cleaned.length > 1) {
      const digits = cleaned.slice(0, 6).split('')
      const newOtp = [...otp]
      for (let i = 0; i < digits.length; i++) {
        if (index + i < 6) {
          newOtp[index + i] = digits[i]
        }
      }
      setOtp(newOtp)
      setOtpError(null)
      const nextIdx = Math.min(index + digits.length, 5)
      inputRefs.current[nextIdx]?.focus()
      return
    }

    const char = cleaned[0]
    const newOtp = [...otp]
    newOtp[index] = char
    setOtp(newOtp)
    setOtpError(null)

    // Automatically advance focus to the next input
    if (index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        // Current box is already empty; move back and clear previous
        const newOtp = [...otp]
        newOtp[index - 1] = ''
        setOtp(newOtp)
        inputRefs.current[index - 1]?.focus()
      } else {
        // Clear current box
        const newOtp = [...otp]
        newOtp[index] = ''
        setOtp(newOtp)
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault()
      inputRefs.current[index - 1]?.focus()
    } else if (e.key === 'ArrowRight' && index < 5) {
      e.preventDefault()
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleOtpPaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text/plain').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return

    const newOtp = [...otp]
    for (let i = 0; i < 6; i++) {
      newOtp[i] = pasted[i] || ''
    }
    setOtp(newOtp)
    setOtpError(null)

    // Focus either the box following the last pasted char or the 6th box
    const nextIndex = Math.min(pasted.length, 5)
    inputRefs.current[nextIndex]?.focus()
  }

  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    if (busy) return

    const fullOtp = otp.join('')
    if (fullOtp.length !== 6) {
      setOtpError('Please enter all 6 digits of the verification code')
      toast.error('Please enter all 6 digits')
      return
    }

    if (expirySeconds <= 0) {
      setOtpError('Your verification code has expired. Request a new code.')
      toast.error('Your verification code has expired. Request a new code.')
      return
    }

    setBusy(true)
    setOtpError(null)

    try {
      const { data } = await api.post('/auth/verify-reset-otp', {
        email: email.trim().toLowerCase(),
        otp: fullOtp,
      })

      setResetToken(data.reset_token)
      setStep(3)
      toast.success('Code verified! Please create your new password.')
    } catch (error) {
      const msg = getErrorMessage(error)
      setOtpError(msg)
      toast.error(msg)
      // Focus first input on error so user can re-enter quickly
      inputRefs.current[0]?.focus()
    } finally {
      setBusy(false)
    }
  }

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || busy) return

    setBusy(true)
    try {
      const { data } = await api.post('/auth/resend-reset-otp', {
        email: email.trim().toLowerCase(),
      })

      // 1. Reset OTP input fields
      setOtp(['', '', '', '', '', ''])
      setOtpError(null)

      // 2. Restart both timers
      setResendCooldown(data.cooldown_seconds || 60)
      setExpirySeconds(300) // Fresh 5-minute validity

      toast.success(data.message || 'A new verification code has been sent!')
      setTimeout(() => {
        inputRefs.current[0]?.focus()
      }, 50)
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  // -------------------------------------------------------------
  // Step 3 Handlers: Set New Password
  // -------------------------------------------------------------
  const handlePasswordChange = (val) => {
    setNewPassword(val)
    if (touchedPassword.password) {
      setPasswordError(validatePassword(val))
    }
    if (touchedPassword.confirm && confirmPassword) {
      setConfirmError(val !== confirmPassword ? 'Passwords do not match' : null)
    }
  }

  const handleConfirmChange = (val) => {
    setConfirmPassword(val)
    if (touchedPassword.confirm) {
      setConfirmError(val !== newPassword ? 'Passwords do not match' : null)
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    if (busy) return

    const pwdErr = validatePassword(newPassword)
    const matchErr = newPassword !== confirmPassword ? 'Passwords do not match' : null

    setPasswordError(pwdErr)
    setConfirmError(matchErr)
    setTouchedPassword({ password: true, confirm: true })

    if (pwdErr || matchErr) {
      toast.error(pwdErr || matchErr)
      return
    }

    setBusy(true)

    try {
      await api.post('/auth/reset-password', {
        reset_token: resetToken,
        new_password: newPassword,
        confirm_password: confirmPassword,
      })

      setStep(4) // Move to Complete state
      toast.success('Password reset successfully! Please sign in.')
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="simple-form-page">
      <div className="auth-card narrow">
        {/* Step Indicator Header */}
        <div className="recovery-stepper" aria-label="Password recovery progress">
          <div className={`recovery-step-node ${step === 1 ? 'active' : step > 1 ? 'completed' : ''}`}>
            <span className="recovery-step-badge">{step > 1 ? <Check size={14} /> : '1'}</span>
            <span>Email</span>
          </div>
          <div className="recovery-step-divider" />
          <div className={`recovery-step-node ${step === 2 ? 'active' : step > 2 ? 'completed' : ''}`}>
            <span className="recovery-step-badge">{step > 2 ? <Check size={14} /> : '2'}</span>
            <span>Verify OTP</span>
          </div>
          <div className="recovery-step-divider" />
          <div className={`recovery-step-node ${step >= 3 ? (step === 4 ? 'completed' : 'active') : ''}`}>
            <span className="recovery-step-badge">{step === 4 ? <Check size={14} /> : '3'}</span>
            <span>New Password</span>
          </div>
        </div>

        {/* ============================================================
            STEP 1: ENTER REGISTERED EMAIL
            ============================================================ */}
        {step === 1 && (
          <form className="auth-step-form" onSubmit={handleRequestOtp} noValidate aria-label="Request password reset code">
            <span className="icon-bubble">
              <Mail />
            </span>

            <span className="eyebrow">Password Recovery</span>

            <h1>Reset your password</h1>

            <p>
              Don't worry, we'll help you get back into your CustomGift account. Follow a few simple steps to securely reset your password.
            </p>

            <label htmlFor="recovery-email">
              <span className="field-label-text">
                <Mail size={16} /> Email address
              </span>
              <input
                id="recovery-email"
                type="email"
                required
                maxLength={EMAIL_MAX_LENGTH}
                autoComplete="email"
                value={email}
                aria-invalid={Boolean(touchedEmail && emailError)}
                onBlur={() => {
                  setTouchedEmail(true)
                  setEmailError(validateEmail(email))
                }}
                onChange={(e) => handleEmailChange(e.target.value)}
                placeholder="you@example.com"
              />
              {touchedEmail && emailError && (
                <small className="field-error" role="alert">
                  {emailError}
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
                  Sending code...
                </>
              ) : (
                'Send Verification Code'
              )}
            </button>

            <p className="auth-switch">
              <Link to="/login">
                <ArrowLeft size={16} /> Back to sign in
              </Link>
            </p>
          </form>
        )}

        {/* ============================================================
            STEP 2: VERIFY 6-DIGIT OTP
            ============================================================ */}
        {step === 2 && (
          <form className="auth-step-form" onSubmit={handleVerifyOtp} noValidate aria-label="Enter 6-digit verification code">
            <span className="icon-bubble">
              <ShieldCheck />
            </span>

            <span className="eyebrow">Email Verification</span>

            <h1>Enter verification code</h1>

            <p>
              We sent a 6-digit verification code to <strong>{maskEmail(email)}</strong>. Enter the code below to continue.
            </p>

            {/* 6 Individual Numeric OTP Input Boxes */}
            <div
              className={`otp-inputs-grid ${otpError ? 'has-error' : ''}`}
              onPaste={handleOtpPaste}
              aria-label="6-digit verification code input"
            >
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => (inputRefs.current[idx] = el)}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  autoComplete="one-time-code"
                  className={`otp-box ${digit ? 'has-value' : ''} ${otpError ? 'error' : ''}`}
                  value={digit}
                  aria-label={`Digit ${idx + 1} of 6`}
                  onChange={(e) => handleOtpBoxChange(idx, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                />
              ))}
            </div>

            {/* Clear Expired Message Banner */}
            {expirySeconds <= 0 && (
              <div className="otp-expired-banner" role="alert">
                <Clock size={16} />
                <span>Your verification code has expired. Request a new code.</span>
              </div>
            )}

            {otpError && expirySeconds > 0 && (
              <small
                className="field-error"
                role="alert"
                style={{ textAlign: 'center', margin: '0 0 6px' }}
              >
                {otpError}
              </small>
            )}

            {/* Expiry countdown and resend control */}
            <div className="otp-timer-row">
              <span className="otp-expiry-indicator">
                <Clock size={15} color={expirySeconds < 60 ? '#dc2626' : '#6d3df5'} />
                {expirySeconds > 0 ? (
                  <span>
                    Code expires in{' '}
                    <strong style={{ color: expirySeconds < 60 ? '#dc2626' : 'var(--text)' }}>
                      {formatTime(expirySeconds)}
                    </strong>
                  </span>
                ) : (
                  <span style={{ color: '#dc2626', fontWeight: 700 }}>Code expired (00:00)</span>
                )}
              </span>

              <button
                type="button"
                className="otp-resend-btn"
                onClick={handleResendOtp}
                disabled={resendCooldown > 0 || busy}
                aria-label={resendCooldown > 0 ? `Resend available in ${resendCooldown}s` : 'Resend Code'}
              >
                <RefreshCw size={13} className={busy ? 'spin-icon' : ''} />
                {resendCooldown > 0 ? `Resend available in ${resendCooldown}s` : 'Resend Code'}
              </button>
            </div>

            <button
              type="submit"
              className="button button-lg full"
              disabled={busy || otp.join('').length !== 6 || expirySeconds <= 0}
              aria-busy={busy}
            >
              {busy ? (
                <>
                  <span className="button-spinner" aria-hidden="true" />
                  Verifying code...
                </>
              ) : (
                'Verify & Continue'
              )}
            </button>

            <div style={{ textAlign: 'center', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => {
                  setStep(1)
                  setOtp(['', '', '', '', '', ''])
                  setOtpError(null)
                }}
                className="otp-back-link"
              >
                <ArrowLeft size={14} /> Change email address
              </button>
            </div>
          </form>
        )}

        {/* ============================================================
            STEP 3: CREATE NEW PASSWORD
            ============================================================ */}
        {step === 3 && (
          <form className="auth-step-form" onSubmit={handleResetPassword} noValidate aria-label="Create new password">
            <span className="icon-bubble">
              <LockKeyhole />
            </span>

            <span className="eyebrow">Identity Confirmed</span>

            <h1>Create new password</h1>

            <p>
              Your verification code has been confirmed. Enter and confirm your new secure password.
            </p>

            <label htmlFor="new-password">
              <span className="field-label-text">
                <LockKeyhole size={16} /> New password
              </span>
              <div className="password-input-wrap">
                <input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  maxLength={PASSWORD_MAX_LENGTH}
                  autoComplete="new-password"
                  value={newPassword}
                  aria-invalid={Boolean(touchedPassword.password && passwordError)}
                  onBlur={() => {
                    setTouchedPassword((prev) => ({ ...prev, password: true }))
                    setPasswordError(validatePassword(newPassword))
                  }}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  placeholder="Create a secure password"
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {touchedPassword.password && passwordError && (
                <small className="field-error" role="alert">
                  {passwordError}
                </small>
              )}
            </label>

            <PasswordStrengthMeter password={newPassword} />

            {/* Live Password Requirement Checklist */}
            <div className="password-checklist" aria-label="Password complexity requirements">
              <div className={`checklist-item ${newPassword.length >= 8 ? 'valid' : ''}`}>
                <Check size={13} /> <span>At least 8 characters</span>
              </div>
              <div className={`checklist-item ${/[A-Z]/.test(newPassword) ? 'valid' : ''}`}>
                <Check size={13} /> <span>One uppercase letter (A-Z)</span>
              </div>
              <div className={`checklist-item ${/[a-z]/.test(newPassword) ? 'valid' : ''}`}>
                <Check size={13} /> <span>One lowercase letter (a-z)</span>
              </div>
              <div className={`checklist-item ${/[0-9]/.test(newPassword) ? 'valid' : ''}`}>
                <Check size={13} /> <span>One number (0-9)</span>
              </div>
              <div className={`checklist-item ${/[^A-Za-z0-9]/.test(newPassword) ? 'valid' : ''}`}>
                <Check size={13} /> <span>One special symbol (optional)</span>
              </div>
            </div>

            <label htmlFor="confirm-password">
              <span className="field-label-text">
                <LockKeyhole size={16} /> Confirm new password
              </span>
              <div className="password-input-wrap">
                <input
                  id="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  maxLength={PASSWORD_MAX_LENGTH}
                  autoComplete="new-password"
                  value={confirmPassword}
                  aria-invalid={Boolean(touchedPassword.confirm && confirmError)}
                  onBlur={() => {
                    setTouchedPassword((prev) => ({ ...prev, confirm: true }))
                    setConfirmError(confirmPassword !== newPassword ? 'Passwords do not match' : null)
                  }}
                  onChange={(e) => handleConfirmChange(e.target.value)}
                  placeholder="Re-enter your new password"
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {touchedPassword.confirm && confirmError && (
                <small className="field-error" role="alert">
                  {confirmError}
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
                  Updating password...
                </>
              ) : (
                'Reset Password'
              )}
            </button>
          </form>
        )}

        {/* ============================================================
            STEP 4: SUCCESS CONFIRMATION
            ============================================================ */}
        {step === 4 && (
          <div className="recovery-success-box" role="status" aria-live="polite">
            <div className="recovery-success-icon">
              <CheckCircle2 size={32} />
            </div>

            <h2 style={{ margin: '4px 0 0', fontSize: '22px', color: 'var(--ink)' }}>
              Your password has been successfully reset!
            </h2>

            <p style={{ color: 'var(--muted)', fontSize: '14.5px', lineHeight: '1.6', margin: '4px 0 16px' }}>
              Your password has been reset successfully. You can now sign in to your CustomGift account with your new credentials.
            </p>

            <Link to="/login" className="button button-lg full">
              Return to Sign In
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
