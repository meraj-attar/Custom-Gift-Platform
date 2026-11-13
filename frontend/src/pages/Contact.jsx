import { CheckCircle2, Loader2, Mail, MessageCircle, Send, Sparkles } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import api, { getErrorMessage } from '../services/api'
import {
  CONTACT_MESSAGE_MAX_LENGTH,
  CONTACT_NAME_MAX_LENGTH,
  CONTACT_SUBJECT_MAX_LENGTH,
  EMAIL_MAX_LENGTH,
  validateContactMessage,
  validateContactName,
  validateContactSubject,
  validateEmail,
} from '../utils/validators'

export default function Contact() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    honeypot: '',
  })
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [busy, setBusy] = useState(false)
  const [submittedSuccess, setSubmittedSuccess] = useState(false)
  const lastSubmitTimeRef = useRef(0)

  useEffect(() => {
    document.title = 'Contact Us — CustomGift | Meaningful Personalized Gifts'
    window.scrollTo(0, 0)
  }, [])

  const validateField = (key, value) => {
    switch (key) {
      case 'name':
        return validateContactName(value)
      case 'email':
        return validateEmail(value)
      case 'subject':
        return validateContactSubject(value)
      case 'message':
        return validateContactMessage(value)
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

    // 1. Debounce rapid duplicate submission clicks
    const now = Date.now()
    if (now - lastSubmitTimeRef.current < 2000) {
      return
    }
    lastSubmitTimeRef.current = now

    // 2. Validate all fields
    const nextErrors = {
      name: validateField('name', form.name),
      email: validateField('email', form.email),
      subject: validateField('subject', form.subject),
      message: validateField('message', form.message),
    }

    setErrors(nextErrors)
    setTouched({ name: true, email: true, subject: true, message: true })

    if (Object.values(nextErrors).some(Boolean)) {
      toast.error('Please resolve the errors highlighted below')
      return
    }

    setBusy(true)
    try {
      const { data } = await api.post('/contact', {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        subject: form.subject.trim(),
        message: form.message.trim(),
        honeypot: form.honeypot || null,
      })

      toast.success(data?.message || 'Thank you! Your message has been received.')
      setSubmittedSuccess(true)
      // Reset form state only upon confirmed successful submission
      setForm({ name: '', email: '', subject: '', message: '', honeypot: '' })
      setTouched({})
      setErrors({})
    } catch (error) {
      toast.error(getErrorMessage(error))
      // Notice: form state is preserved so customer input is never lost on network or server error
    } finally {
      setBusy(false)
    }
  }

  const handleSendAnother = () => {
    setSubmittedSuccess(false)
    setForm({ name: '', email: '', subject: '', message: '', honeypot: '' })
    setTouched({})
    setErrors({})
  }

  return (
    <div className="page-section contact-page" data-testid="contact-page">
      <div className="container contact-grid">
        <div className="contact-copy">
          <span className="eyebrow">
            <Sparkles size={14} /> We’d love to hear from you
          </span>
          <h1>Questions, ideas or a special gifting request?</h1>
          <p>
            Send us a message. Our team is here to assist with custom designs, corporate orders,
            order inquiries, and questions about any keepsake.
          </p>

          <div className="contact-points">
            <span>
              <Mail aria-hidden="true" />
              <strong>Email</strong>
              <small>
                <a href="mailto:hello@customgift.dev" className="contact-link">
                  hello@customgift.dev
                </a>
              </small>
            </span>
            <span>
              <MessageCircle aria-hidden="true" />
              <strong>Support</strong>
              <small>Mon–Sat · 10 AM–7 PM IST</small>
            </span>
          </div>
        </div>

        <div className="contact-form-container">
          {submittedSuccess ? (
            <div className="contact-success-card" role="status" aria-live="polite">
              <div className="success-icon-wrap">
                <CheckCircle2 size={42} />
              </div>
              <h2>Message Sent Successfully!</h2>
              <p>
                Thank you for reaching out to CustomGift. We have received your message and our
                team will review your request and get back to you shortly.
              </p>
              <button
                type="button"
                className="button button-md button-outline"
                onClick={handleSendAnother}
              >
                Send Another Message
              </button>
            </div>
          ) : (
            <form className="contact-form" onSubmit={submit} noValidate aria-label="Contact inquiry form">
              {/* Invisible honeypot trap for automated bots */}
              <div
                style={{ display: 'none', position: 'absolute', left: '-9999px' }}
                aria-hidden="true"
              >
                <label htmlFor="company_website">Leave this field blank</label>
                <input
                  id="company_website"
                  type="text"
                  name="company_website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={form.honeypot}
                  onChange={(e) => setForm((prev) => ({ ...prev, honeypot: e.target.value }))}
                />
              </div>

              <div className="form-grid two">
                <label htmlFor="contact-name">
                  <span className="label-text">
                    Name <span className="required-star" aria-hidden="true">*</span>
                  </span>
                  <input
                    id="contact-name"
                    name="name"
                    type="text"
                    required
                    aria-required="true"
                    aria-invalid={Boolean(touched.name && errors.name)}
                    aria-describedby={touched.name && errors.name ? 'contact-name-error' : undefined}
                    maxLength={CONTACT_NAME_MAX_LENGTH}
                    value={form.name}
                    onBlur={() => handleBlur('name')}
                    onChange={(e) => field('name', e.target.value)}
                    placeholder="Your name"
                    disabled={busy}
                    className={touched.name && errors.name ? 'input-error' : ''}
                  />
                  {touched.name && errors.name && (
                    <small id="contact-name-error" className="field-error" role="alert">
                      {errors.name}
                    </small>
                  )}
                </label>

                <label htmlFor="contact-email">
                  <span className="label-text">
                    Email <span className="required-star" aria-hidden="true">*</span>
                  </span>
                  <input
                    id="contact-email"
                    name="email"
                    type="email"
                    required
                    aria-required="true"
                    aria-invalid={Boolean(touched.email && errors.email)}
                    aria-describedby={touched.email && errors.email ? 'contact-email-error' : undefined}
                    maxLength={EMAIL_MAX_LENGTH}
                    value={form.email}
                    onBlur={() => handleBlur('email')}
                    onChange={(e) => field('email', e.target.value)}
                    placeholder="you@example.com"
                    disabled={busy}
                    className={touched.email && errors.email ? 'input-error' : ''}
                  />
                  {touched.email && errors.email && (
                    <small id="contact-email-error" className="field-error" role="alert">
                      {errors.email}
                    </small>
                  )}
                </label>
              </div>

              <label htmlFor="contact-subject">
                <span className="label-text">
                  Subject <span className="required-star" aria-hidden="true">*</span>
                </span>
                <input
                  id="contact-subject"
                  name="subject"
                  type="text"
                  required
                  aria-required="true"
                  aria-invalid={Boolean(touched.subject && errors.subject)}
                  aria-describedby={touched.subject && errors.subject ? 'contact-subject-error' : undefined}
                  maxLength={CONTACT_SUBJECT_MAX_LENGTH}
                  value={form.subject}
                  onBlur={() => handleBlur('subject')}
                  onChange={(e) => field('subject', e.target.value)}
                  placeholder="What is this regarding?"
                  disabled={busy}
                  className={touched.subject && errors.subject ? 'input-error' : ''}
                />
                {touched.subject && errors.subject && (
                  <small id="contact-subject-error" className="field-error" role="alert">
                    {errors.subject}
                  </small>
                )}
              </label>

              <label htmlFor="contact-message">
                <div className="label-row-with-counter">
                  <span className="label-text">
                    Message <span className="required-star" aria-hidden="true">*</span>
                  </span>
                  <span
                    className={`contact-char-counter ${
                      form.message.length >= CONTACT_MESSAGE_MAX_LENGTH - 100 ? 'near-limit' : ''
                    }`}
                    aria-live="polite"
                  >
                    {form.message.length} / {CONTACT_MESSAGE_MAX_LENGTH}
                  </span>
                </div>
                <textarea
                  id="contact-message"
                  name="message"
                  rows="7"
                  required
                  aria-required="true"
                  aria-invalid={Boolean(touched.message && errors.message)}
                  aria-describedby={touched.message && errors.message ? 'contact-message-error' : undefined}
                  maxLength={CONTACT_MESSAGE_MAX_LENGTH}
                  value={form.message}
                  onBlur={() => handleBlur('message')}
                  onChange={(e) => field('message', e.target.value)}
                  placeholder="Tell us how we can help..."
                  disabled={busy}
                  className={touched.message && errors.message ? 'input-error' : ''}
                />
                {touched.message && errors.message && (
                  <small id="contact-message-error" className="field-error" role="alert">
                    {errors.message}
                  </small>
                )}
              </label>

              <button
                type="submit"
                className="button button-lg contact-submit-btn"
                disabled={busy}
                aria-label={busy ? 'Sending your message...' : 'Send message'}
              >
                {busy ? (
                  <>
                    <Loader2 size={17} className="spin-icon" /> Sending message...
                  </>
                ) : (
                  <>
                    <Send size={17} /> Send message
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
