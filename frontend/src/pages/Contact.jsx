import { Mail, MessageCircle, Send, Sparkles } from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'
import api, { getErrorMessage } from '../services/api'
import {
  EMAIL_MAX_LENGTH,
  MESSAGE_MAX_LENGTH,
  NAME_MAX_LENGTH,
  validateEmail,
  validateText,
} from '../utils/validators'

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [busy, setBusy] = useState(false)

  const validateField = (key, value) => {
    switch (key) {
      case 'name':
        return validateText(value, 'Name', 2, NAME_MAX_LENGTH, true)
      case 'email':
        return validateEmail(value)
      case 'subject':
        return validateText(value, 'Subject', 3, 180, true)
      case 'message':
        return validateText(value, 'Message', 10, MESSAGE_MAX_LENGTH, true)
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

    const nextErrors = {
      name: validateField('name', form.name),
      email: validateField('email', form.email),
      subject: validateField('subject', form.subject),
      message: validateField('message', form.message),
    }

    setErrors(nextErrors)
    setTouched({ name: true, email: true, subject: true, message: true })

    if (Object.values(nextErrors).some(Boolean)) {
      toast.error('Please fix the errors before submitting')
      return
    }

    setBusy(true)
    try {
      const { data } = await api.post('/contact', {
        name: form.name.trim(),
        email: form.email.trim(),
        subject: form.subject.trim(),
        message: form.message.trim(),
      })
      toast.success(data.message)
      setForm({ name: '', email: '', subject: '', message: '' })
      setTouched({})
      setErrors({})
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page-section">
      <div className="container contact-grid">
        <div className="contact-copy">
          <span className="eyebrow"><Sparkles /> We’d love to hear from you</span>
          <h1>Questions, ideas or a special gifting request?</h1>
          <p>
            Send us a message. This form writes directly to the backend database,
            so it is functional even without external email credentials.
          </p>
          <div className="contact-points">
            <span>
              <Mail /> <strong>Email</strong><small>hello@customgift.dev</small>
            </span>
            <span>
              <MessageCircle /> <strong>Support</strong><small>Mon–Sat · 10 AM–7 PM</small>
            </span>
          </div>
        </div>
        <form className="contact-form" onSubmit={submit} noValidate>
          <div className="form-grid two">
            <label>
              Name
              <input
                required
                maxLength={NAME_MAX_LENGTH}
                value={form.name}
                onBlur={() => handleBlur('name')}
                onChange={(e) => field('name', e.target.value)}
                placeholder="Your name"
              />
              {touched.name && errors.name && <small className="field-error">{errors.name}</small>}
            </label>
            <label>
              Email
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
          </div>
          <label>
            Subject
            <input
              required
              maxLength={180}
              value={form.subject}
              onBlur={() => handleBlur('subject')}
              onChange={(e) => field('subject', e.target.value)}
              placeholder="What is this regarding?"
            />
            {touched.subject && errors.subject && <small className="field-error">{errors.subject}</small>}
          </label>
          <label>
            Message
            <textarea
              rows="7"
              required
              maxLength={MESSAGE_MAX_LENGTH}
              value={form.message}
              onBlur={() => handleBlur('message')}
              onChange={(e) => field('message', e.target.value)}
              placeholder="Tell us how we can help..."
            />
            {touched.message && errors.message && <small className="field-error">{errors.message}</small>}
          </label>
          <button className="button button-lg" disabled={busy}>
            <Send size={17} /> {busy ? 'Sending...' : 'Send message'}
          </button>
        </form>
      </div>
    </div>
  )
}
