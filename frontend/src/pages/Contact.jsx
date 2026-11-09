import { Mail, MessageCircle, Send, Sparkles } from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'
import api, { getErrorMessage } from '../services/api'

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' }); const [busy, setBusy] = useState(false)
  const field = (key, value) => setForm({ ...form, [key]: value })
  const submit = async (e) => { e.preventDefault(); setBusy(true); try { const { data } = await api.post('/contact', form); toast.success(data.message); setForm({ name: '', email: '', subject: '', message: '' }) } catch (error) { toast.error(getErrorMessage(error)) } finally { setBusy(false) } }
  return <div className="page-section"><div className="container contact-grid"><div className="contact-copy"><span className="eyebrow"><Sparkles /> We’d love to hear from you</span><h1>Questions, ideas or a special gifting request?</h1><p>Send us a message. This form writes directly to the backend database, so it is functional even without external email credentials.</p><div className="contact-points"><span><Mail /> <strong>Email</strong><small>hello@customgift.dev</small></span><span><MessageCircle /> <strong>Support</strong><small>Mon–Sat · 10 AM–7 PM</small></span></div></div><form className="contact-form" onSubmit={submit}><div className="form-grid two"><label>Name<input required value={form.name} onChange={(e) => field('name', e.target.value)} /></label><label>Email<input type="email" required value={form.email} onChange={(e) => field('email', e.target.value)} /></label></div><label>Subject<input required value={form.subject} onChange={(e) => field('subject', e.target.value)} /></label><label>Message<textarea rows="7" required value={form.message} onChange={(e) => field('message', e.target.value)} placeholder="Tell us how we can help..." /></label><button className="button button-lg" disabled={busy}><Send size={17} /> {busy ? 'Sending...' : 'Send message'}</button></form></div></div>
}
