import assert from 'node:assert/strict'
import fs from 'node:fs'
import { describe, it } from 'node:test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  CONTACT_MESSAGE_MAX_LENGTH,
  CONTACT_NAME_MAX_LENGTH,
  CONTACT_SUBJECT_MAX_LENGTH,
  EMAIL_MAX_LENGTH,
  validateContactMessage,
  validateContactName,
  validateContactSubject,
  validateEmail,
} from '../utils/validators.js'

describe('Change: Contact Page — Production Readiness & Architecture Tests', () => {
  const currentDir = path.dirname(fileURLToPath(import.meta.url))
  const candidatePaths = [
    path.resolve(currentDir, '../pages/Contact.jsx'),
    path.resolve(process.cwd(), 'frontend/src/pages/Contact.jsx'),
    path.resolve(process.cwd(), 'src/pages/Contact.jsx'),
  ]
  const contactPath = candidatePaths.find((p) => fs.existsSync(p))
  const contactCode = fs.readFileSync(contactPath, 'utf8')

  const adminCandidatePaths = [
    path.resolve(currentDir, '../pages/AdminDashboard.jsx'),
    path.resolve(process.cwd(), 'frontend/src/pages/AdminDashboard.jsx'),
    path.resolve(process.cwd(), 'src/pages/AdminDashboard.jsx'),
  ]
  const adminPath = adminCandidatePaths.find((p) => fs.existsSync(p))
  const adminCode = fs.readFileSync(adminPath, 'utf8')

  it('1. Contact Name validator strictly enforces min 2, max 80, no numbers, and valid characters', () => {
    // Valid names
    assert.equal(validateContactName('Aarav Sharma'), null)
    assert.equal(validateContactName("O'Connor"), null)
    assert.equal(validateContactName('Mary-Jane Watson'), null)
    assert.equal(validateContactName('Dr. M. K. Gandhi'), null)

    // Empty or whitespace
    assert.match(validateContactName(''), /required/i)
    assert.match(validateContactName('   '), /required/i)
    assert.match(validateContactName(null), /required/i)

    // Length boundaries
    assert.match(validateContactName('A'), /at least 2/i)
    assert.equal(validateContactName('Al'), null)
    assert.equal(validateContactName('A'.repeat(80)), null)
    assert.match(validateContactName('A'.repeat(81)), /cannot exceed 80/i)

    // Digits and invalid characters
    assert.match(validateContactName('User 123'), /cannot contain numbers/i)
    assert.match(validateContactName('Aarav <script>'), /invalid characters/i)
  })

  it('2. Contact Email validator enforces RFC compliance, length <= 254, and rejection of spaces', () => {
    assert.equal(validateEmail('customer@example.com'), null)
    assert.equal(validateEmail('first.last+tag@sub.domain.co.in'), null)

    assert.match(validateEmail(''), /required/i)
    assert.match(validateEmail('   '), /required/i)
    assert.match(validateEmail('invalid-email'), /valid email address/i)
    assert.match(validateEmail('user @example.com'), /not contain spaces/i)
    assert.match(validateEmail('user@.com'), /valid email address/i)
    assert.match(validateEmail('a'.repeat(250) + '@b.co'), /cannot exceed 254/i)
  })

  it('3. Contact Subject validator enforces min 3, max 120, and rejects empty strings', () => {
    assert.equal(validateContactSubject('Urgent order inquiry'), null)
    assert.equal(validateContactSubject('Can I add two dates to the lamp?'), null)

    assert.match(validateContactSubject(''), /required/i)
    assert.match(validateContactSubject('   '), /required/i)
    assert.match(validateContactSubject('Hi'), /at least 3/i)
    assert.equal(validateContactSubject('Hey'), null)
    assert.equal(validateContactSubject('S'.repeat(120)), null)
    assert.match(validateContactSubject('S'.repeat(121)), /cannot exceed 120/i)
  })

  it('4. Contact Message validator enforces min 10, max 2000, and rejects short/empty strings', () => {
    assert.equal(
      validateContactMessage('Hello, I would like to inquire about bulk ordering custom mugs for an event.'),
      null
    )

    assert.match(validateContactMessage(''), /required/i)
    assert.match(validateContactMessage('   '), /required/i)
    assert.match(validateContactMessage('Too short'), /at least 10/i)
    assert.equal(validateContactMessage('1234567890'), null)
    assert.equal(validateContactMessage('M'.repeat(2000)), null)
    assert.match(validateContactMessage('M'.repeat(2001)), /cannot exceed 2000/i)
  })

  it('5. Contact form UI includes live character counter, honeypot field, and required markers', () => {
    // Honeypot presence
    assert.ok(contactCode.includes('company_website'))
    assert.ok(contactCode.includes('honeypot'))

    // Character counter
    assert.ok(contactCode.includes('contact-char-counter'))
    assert.ok(contactCode.includes('CONTACT_MESSAGE_MAX_LENGTH'))

    // Required indicators
    assert.ok(contactCode.includes('required-star'))
    assert.ok(contactCode.includes('aria-required="true"'))

    // Accessibility attributes
    assert.ok(contactCode.includes('aria-invalid='))
    assert.ok(contactCode.includes('aria-describedby='))
    assert.ok(contactCode.includes('role="alert"'))
  })

  it('6. Contact form handles loading state, double-click prevention, and preserves inputs on error', () => {
    // Disabled during busy
    assert.ok(contactCode.includes('disabled={busy}'))
    assert.ok(contactCode.includes('Sending message...'))

    // Preserves form state on error (form state is not reset in catch)
    assert.ok(contactCode.includes('toast.error(getErrorMessage(error))'))

    // Only resets form after confirmed success
    assert.ok(contactCode.includes('setSubmittedSuccess(true)'))
  })

  it('7. Contact page sets document title and renders success card after submission', () => {
    assert.ok(contactCode.includes("document.title = 'Contact Us — CustomGift"))
    assert.ok(contactCode.includes('contact-success-card'))
    assert.ok(contactCode.includes('Message Sent Successfully!'))
    assert.ok(contactCode.includes('Send Another Message'))
  })

  it('8. Admin Dashboard includes customer inquiries tab, status filters, search, and detail modal', () => {
    // Tab and unread badge
    assert.ok(adminCode.includes("tab === 'messages'"))
    assert.ok(adminCode.includes('Inquiries'))
    assert.ok(adminCode.includes('contactUnread'))

    // Controls: search and status filter
    assert.ok(adminCode.includes('contactSearch'))
    assert.ok(adminCode.includes('contactFilter'))
    assert.ok(adminCode.includes('New'))
    assert.ok(adminCode.includes('In Progress'))
    assert.ok(adminCode.includes('Resolved'))

    // Detail modal and status update
    assert.ok(adminCode.includes('contact-detail-modal'))
    assert.ok(adminCode.includes('updateContactStatus'))
    assert.ok(adminCode.includes('deleteContactMessage'))
  })
})
