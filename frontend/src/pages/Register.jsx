import { Gift, LockKeyhole, Mail, MapPin, Phone, Sparkles, UserRound } from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getErrorMessage } from '../services/api'

export default function Register() {
  const { user, register } = useAuth(); const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', address: '' }); const [busy, setBusy] = useState(false)
  if (user) return <Navigate to="/" replace />
  const submit = async (e) => { e.preventDefault(); setBusy(true); try { await register(form); toast.success('Your account is ready'); navigate('/') } catch (error) { toast.error(getErrorMessage(error)) } finally { setBusy(false) } }
  const field = (key, value) => setForm({ ...form, [key]: value })
  return <div className="auth-page"><div className="auth-visual register-visual"><div><span className="brand-mark large"><Gift /></span><span className="eyebrow light"><Sparkles /> Start creating</span><h2>A little personalization turns a nice gift into their gift.</h2><p>Create your account to upload private photos, personalize products and track every order.</p></div></div><div className="auth-form-wrap"><form className="auth-card" onSubmit={submit}><span className="eyebrow">Join CustomGift</span><h1>Create your account</h1><div className="form-grid two"><label><span><UserRound size={16} /> Full name</span><input required value={form.name} onChange={(e) => field('name', e.target.value)} /></label><label><span><Phone size={16} /> Phone</span><input value={form.phone} onChange={(e) => field('phone', e.target.value)} /></label></div><label><span><Mail size={16} /> Email</span><input type="email" required value={form.email} onChange={(e) => field('email', e.target.value)} /></label><label><span><LockKeyhole size={16} /> Password</span><input type="password" minLength="8" required value={form.password} onChange={(e) => field('password', e.target.value)} placeholder="Uppercase, lowercase & number" /></label><label><span><MapPin size={16} /> Address (optional)</span><textarea value={form.address} onChange={(e) => field('address', e.target.value)} /></label><button className="button button-lg full" disabled={busy}>{busy ? 'Creating account...' : 'Create account'}</button><p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p></form></div></div>
}
