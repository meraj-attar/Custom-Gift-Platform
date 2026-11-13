import {
  CalendarDays,
  CheckCircle2,
  Edit2,
  Eye,
  EyeOff,
  Heart,
  KeyRound,
  Lock,
  Mail,
  MapPin,
  Phone,
  Save,
  ShieldCheck,
  ShoppingBag,
  User,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Link, Navigate } from 'react-router-dom'
import PasswordStrengthMeter from '../components/PasswordStrengthMeter'
import { useAuth } from '../context/AuthContext'
import api, { getErrorMessage } from '../services/api'
import {
  ADDRESS_MAX_LENGTH,
  NAME_MAX_LENGTH,
  PHONE_MAX_LENGTH,
  validateAddress,
  validateFullName,
  validatePassword,
  validatePhone,
} from '../utils/validators'

export default function Profile() {
  const { user, login } = useAuth()
  const [profile, setProfile] = useState(user || null)
  const [loading, setLoading] = useState(!user)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  // Edit profile form
  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    address: user?.address || '',
  })
  const [formErrors, setFormErrors] = useState({})

  // Change password form
  const [pwForm, setPwForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  })
  const [pwErrors, setPwErrors] = useState({})
  const [pwSaving, setPwSaving] = useState(false)
  const [showCurrentPw, setShowCurrentPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)

  useEffect(() => {
    document.title = 'My Profile — CustomGift'
    if (user) {
      api
        .get('/auth/me')
        .then(({ data }) => {
          setProfile(data)
          setForm({
            name: data.name || '',
            phone: data.phone || '',
            address: data.address || '',
          })
        })
        .catch(() => {
          // Fall back to context user
          setProfile(user)
        })
        .finally(() => setLoading(false))
    }
  }, [user])

  if (!user && !loading) {
    return <Navigate to="/login" state={{ from: '/profile' }} replace />
  }

  if (loading || !profile) {
    return (
      <div className="page-loader" aria-label="Loading profile...">
        <span className="spinner" />
      </div>
    )
  }

  const handleEditChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    // Live validation
    if (field === 'name') {
      setFormErrors((prev) => ({ ...prev, name: validateFullName(value) }))
    } else if (field === 'phone') {
      setFormErrors((prev) => ({ ...prev, phone: validatePhone(value, false) }))
    } else if (field === 'address') {
      setFormErrors((prev) => ({ ...prev, address: validateAddress(value, false) }))
    }
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    const nameErr = validateFullName(form.name)
    const phoneErr = validatePhone(form.phone, false)
    const addressErr = validateAddress(form.address, false)

    if (nameErr || phoneErr || addressErr) {
      setFormErrors({
        name: nameErr,
        phone: phoneErr,
        address: addressErr,
      })
      toast.error('Please correct the highlighted fields.')
      return
    }

    setSaving(true)
    try {
      const { data } = await api.put('/auth/me', {
        name: form.name.trim(),
        phone: form.phone ? form.phone.trim() : null,
        address: form.address ? form.address.trim() : null,
      })
      setProfile(data)
      setEditing(false)
      toast.success('Profile updated successfully!')
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setForm({
      name: profile.name || '',
      phone: profile.phone || '',
      address: profile.address || '',
    })
    setFormErrors({})
    setEditing(false)
  }

  const handlePwChange = (field, value) => {
    setPwForm((prev) => ({ ...prev, [field]: value }))
    if (field === 'new_password') {
      setPwErrors((prev) => ({ ...prev, new_password: validatePassword(value) }))
    } else if (field === 'confirm_password') {
      if (value !== pwForm.new_password) {
        setPwErrors((prev) => ({ ...prev, confirm_password: 'Passwords do not match.' }))
      } else {
        setPwErrors((prev) => ({ ...prev, confirm_password: null }))
      }
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (!pwForm.current_password) {
      setPwErrors((prev) => ({ ...prev, current_password: 'Enter your current password.' }))
      toast.error('Current password is required.')
      return
    }

    const newPwErr = validatePassword(pwForm.new_password)
    let confirmErr = null
    if (pwForm.new_password !== pwForm.confirm_password) {
      confirmErr = 'Passwords do not match.'
    }

    if (newPwErr || confirmErr) {
      setPwErrors({
        current_password: null,
        new_password: newPwErr,
        confirm_password: confirmErr,
      })
      toast.error('Please check your password entries.')
      return
    }

    setPwSaving(true)
    try {
      await api.post('/auth/change-password', {
        current_password: pwForm.current_password,
        new_password: pwForm.new_password,
        confirm_password: pwForm.confirm_password,
      })
      toast.success('Password changed successfully!')
      setPwForm({
        current_password: '',
        new_password: '',
        confirm_password: '',
      })
      setPwErrors({})
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setPwSaving(false)
    }
  }

  const memberSince = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Valued customer'

  return (
    <div className="page-section profile-page-section">
      <div className="container profile-container">
        <div className="page-hero compact align-left">
          <span className="eyebrow">Account Settings</span>
          <h1>My Profile</h1>
          <p>Manage your personal information, address, and security preferences.</p>
        </div>

        <div className="profile-layout-grid">
          {/* Left Column: Profile Card & Edit Form */}
          <section className="profile-card profile-details-card">
            <div className="profile-card-header">
              <div className="profile-avatar-wrap">
                <div className="profile-avatar-bubble">
                  {profile.name ? profile.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div>
                  <h2>{profile.name}</h2>
                  <span className="profile-role-tag">
                    <ShieldCheck size={14} /> {profile.role === 'admin' ? 'Administrator' : 'Customer'}
                  </span>
                </div>
              </div>
              {!editing && (
                <button
                  type="button"
                  className="button button-sm button-outline profile-edit-btn"
                  onClick={() => setEditing(true)}
                  aria-label="Edit personal details"
                >
                  <Edit2 size={14} /> Edit details
                </button>
              )}
            </div>

            {!editing ? (
              <div className="profile-info-grid">
                <div className="profile-info-item">
                  <span className="info-label">
                    <Mail size={15} /> Registered Email
                  </span>
                  <strong className="info-value">{profile.email}</strong>
                  <small className="info-hint">Used for sign-in & order receipts</small>
                </div>

                <div className="profile-info-item">
                  <span className="info-label">
                    <Phone size={15} /> Mobile Number
                  </span>
                  <strong className="info-value">
                    {profile.phone ? profile.phone : <span className="text-muted">Not provided</span>}
                  </strong>
                  <small className="info-hint">For courier delivery updates</small>
                </div>

                <div className="profile-info-item full">
                  <span className="info-label">
                    <MapPin size={15} /> Saved Delivery Address
                  </span>
                  <p className="info-value address-value">
                    {profile.address ? profile.address : <span className="text-muted">No delivery address saved yet.</span>}
                  </p>
                  <small className="info-hint">Pre-filled automatically during checkout</small>
                </div>

                <div className="profile-info-item">
                  <span className="info-label">
                    <CalendarDays size={15} /> Member Since
                  </span>
                  <strong className="info-value">{memberSince}</strong>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSaveProfile} className="profile-edit-form" noValidate>
                <div className="form-field">
                  <label htmlFor="profile-name">
                    Full Name <span className="required-star">*</span>
                  </label>
                  <input
                    id="profile-name"
                    type="text"
                    value={form.name}
                    maxLength={NAME_MAX_LENGTH}
                    onChange={(e) => handleEditChange('name', e.target.value)}
                    className={formErrors.name ? 'input-error' : ''}
                    disabled={saving}
                    required
                  />
                  {formErrors.name && <span className="error-text">{formErrors.name}</span>}
                </div>

                <div className="form-field">
                  <label htmlFor="profile-phone">Mobile Number (Indian 10-digit)</label>
                  <input
                    id="profile-phone"
                    type="tel"
                    value={form.phone}
                    maxLength={PHONE_MAX_LENGTH}
                    placeholder="+91 98765 43210"
                    onChange={(e) => handleEditChange('phone', e.target.value)}
                    className={formErrors.phone ? 'input-error' : ''}
                    disabled={saving}
                  />
                  {formErrors.phone && <span className="error-text">{formErrors.phone}</span>}
                </div>

                <div className="form-field full">
                  <label htmlFor="profile-address">Saved Shipping Address</label>
                  <textarea
                    id="profile-address"
                    rows="3"
                    value={form.address}
                    maxLength={ADDRESS_MAX_LENGTH}
                    placeholder="House/Flat number, Street, Landmark, City, State, PIN"
                    onChange={(e) => handleEditChange('address', e.target.value)}
                    className={formErrors.address ? 'input-error' : ''}
                    disabled={saving}
                  />
                  {formErrors.address && <span className="error-text">{formErrors.address}</span>}
                </div>

                <div className="profile-form-actions">
                  <button
                    type="submit"
                    className="button button-primary profile-save-btn"
                    disabled={saving}
                  >
                    <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    type="button"
                    className="button button-outline"
                    onClick={handleCancelEdit}
                    disabled={saving}
                  >
                    <X size={16} /> Cancel
                  </button>
                </div>
              </form>
            )}

            <div className="profile-quick-links">
              <h3>Quick Actions</h3>
              <div className="quick-links-row">
                <Link to="/orders" className="quick-link-chip">
                  <ShoppingBag size={15} /> My Orders
                </Link>
                <Link to="/wishlist" className="quick-link-chip">
                  <Heart size={15} /> My Wishlist
                </Link>
                <Link to="/cart" className="quick-link-chip">
                  <ShoppingBag size={15} /> Gift Bag
                </Link>
              </div>
            </div>
          </section>

          {/* Right Column: Security & Change Password */}
          <section className="profile-card profile-security-card">
            <div className="security-card-header">
              <div className="security-icon-bubble">
                <Lock size={20} />
              </div>
              <div>
                <h2>Security & Password</h2>
                <p>Ensure your account is using a strong, unique password.</p>
              </div>
            </div>

            <form onSubmit={handleChangePassword} className="change-password-form" noValidate>
              <div className="form-field">
                <label htmlFor="current-pw">Current Password</label>
                <div className="password-input-wrap">
                  <input
                    id="current-pw"
                    type={showCurrentPw ? 'text' : 'password'}
                    value={pwForm.current_password}
                    onChange={(e) => {
                      setPwForm((prev) => ({ ...prev, current_password: e.target.value }))
                      setPwErrors((prev) => ({ ...prev, current_password: null }))
                    }}
                    className={pwErrors.current_password ? 'input-error' : ''}
                    disabled={pwSaving}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowCurrentPw(!showCurrentPw)}
                    aria-label={showCurrentPw ? 'Hide password' : 'Show password'}
                  >
                    {showCurrentPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {pwErrors.current_password && (
                  <span className="error-text">{pwErrors.current_password}</span>
                )}
              </div>

              <div className="form-field">
                <label htmlFor="new-pw">New Password</label>
                <div className="password-input-wrap">
                  <input
                    id="new-pw"
                    type={showNewPw ? 'text' : 'password'}
                    value={pwForm.new_password}
                    onChange={(e) => handlePwChange('new_password', e.target.value)}
                    className={pwErrors.new_password ? 'input-error' : ''}
                    disabled={pwSaving}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowNewPw(!showNewPw)}
                    aria-label={showNewPw ? 'Hide password' : 'Show password'}
                  >
                    {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <PasswordStrengthMeter password={pwForm.new_password} />
                {pwErrors.new_password && (
                  <span className="error-text">{pwErrors.new_password}</span>
                )}
              </div>

              <div className="form-field">
                <label htmlFor="confirm-pw">Confirm New Password</label>
                <div className="password-input-wrap">
                  <input
                    id="confirm-pw"
                    type={showConfirmPw ? 'text' : 'password'}
                    value={pwForm.confirm_password}
                    onChange={(e) => handlePwChange('confirm_password', e.target.value)}
                    className={pwErrors.confirm_password ? 'input-error' : ''}
                    disabled={pwSaving}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowConfirmPw(!showConfirmPw)}
                    aria-label={showConfirmPw ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {pwErrors.confirm_password && (
                  <span className="error-text">{pwErrors.confirm_password}</span>
                )}
              </div>

              <button
                type="submit"
                className="button button-lg button-primary full update-pw-btn"
                disabled={pwSaving}
              >
                <KeyRound size={17} /> {pwSaving ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  )
}
