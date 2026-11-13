import { isValidIndianState } from './indianStates.js'

// Comprehensive client-side validators mirroring backend rules

export const EMAIL_MAX_LENGTH = 254
export const PASSWORD_MAX_LENGTH = 128
export const PHONE_MAX_LENGTH = 15
export const PINCODE_LENGTH = 6
export const NAME_MAX_LENGTH = 100
export const ADDRESS_MAX_LENGTH = 500
export const MESSAGE_MAX_LENGTH = 4000
export const CONTACT_NAME_MAX_LENGTH = 80
export const CONTACT_SUBJECT_MAX_LENGTH = 120
export const CONTACT_MESSAGE_MAX_LENGTH = 2000

// Standards-aware RFC email regex (rejects control characters, newlines, multiple addresses)
export const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/

// Indian mobile phone regex: 10 digits starting with 6, 7, 8, or 9
export const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/

// Indian 6-digit postal code (PIN)
export const PINCODE_REGEX = /^[1-9]\d{5}$/

export function validateFullName(name) {
  if (!name || typeof name !== 'string') return 'Full name is required'
  const trimmed = name.trim()
  if (!trimmed) return 'Full name is required'
  if (trimmed.length < 2) return 'Full name must be at least 2 characters'
  if (trimmed.length > NAME_MAX_LENGTH) return `Full name cannot exceed ${NAME_MAX_LENGTH} characters`

  if (/\d/.test(trimmed)) return 'Full name cannot contain numbers'
  if (/[\r\n\x00-\x1f\x7f]/.test(trimmed)) return 'Full name contains invalid characters'

  // Require at least 2 Unicode alphabetic letters (supports Indian scripts, Latin, etc.)
  const lettersOnly = trimmed.replace(/[^\p{L}]/gu, '')
  if (lettersOnly.length < 2) return 'Full name must contain at least 2 letters'

  // Allow Unicode letters (\p{L}), combining marks/matras (\p{M}), spaces, hyphens, apostrophes, and periods
  if (!/^[\p{L}\p{M}\s.'-]+$/u.test(trimmed)) {
    return 'Full name contains invalid characters. Use letters, spaces, hyphens, or apostrophes'
  }

  return null
}

export function validateContactName(name) {
  if (!name || typeof name !== 'string') return 'Name is required'
  const trimmed = name.trim()
  if (!trimmed) return 'Name is required'
  if (trimmed.length < 2) return 'Name must be at least 2 characters'
  if (trimmed.length > CONTACT_NAME_MAX_LENGTH) return `Name cannot exceed ${CONTACT_NAME_MAX_LENGTH} characters`
  if (/\d/.test(trimmed)) return 'Name cannot contain numbers'
  if (/[\r\n\x00-\x1f\x7f]/.test(trimmed)) return 'Name contains invalid characters'
  const lettersOnly = trimmed.replace(/[^\p{L}]/gu, '')
  if (lettersOnly.length < 2) return 'Name must contain at least 2 letters'
  if (!/^[\p{L}\p{M}\s.'-]+$/u.test(trimmed)) {
    return 'Name contains invalid characters. Use letters, spaces, hyphens, or apostrophes'
  }
  return null
}

export function validateContactSubject(subject) {
  if (!subject || typeof subject !== 'string') return 'Subject is required'
  const trimmed = subject.trim()
  if (!trimmed) return 'Subject is required'
  if (trimmed.length < 3) return 'Subject must be at least 3 characters'
  if (trimmed.length > CONTACT_SUBJECT_MAX_LENGTH) return `Subject cannot exceed ${CONTACT_SUBJECT_MAX_LENGTH} characters`
  if (/[\r\n\x00-\x1f\x7f]/.test(trimmed)) return 'Subject contains invalid characters'
  return null
}

export function validateContactMessage(message) {
  if (!message || typeof message !== 'string') return 'Message is required'
  const trimmed = message.trim()
  if (!trimmed) return 'Message is required'
  if (trimmed.length < 10) return 'Message must be at least 10 characters'
  if (trimmed.length > CONTACT_MESSAGE_MAX_LENGTH) return `Message cannot exceed ${CONTACT_MESSAGE_MAX_LENGTH} characters`
  if (/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(trimmed)) return 'Message contains invalid characters'
  return null
}

export function normalizePhone(phone) {
  if (!phone || typeof phone !== 'string') return ''
  const cleaned = phone.trim()
  if (!cleaned) return ''

  // Strip spaces, hyphens, parentheses, dots
  let digits = cleaned.replace(/[\s\-().]/g, '')

  if (digits.startsWith('+91')) {
    digits = digits.slice(3)
  } else if (digits.startsWith('91') && digits.length === 12) {
    digits = digits.slice(2)
  } else if (digits.startsWith('0') && digits.length === 11) {
    digits = digits.slice(1)
  }
  return digits
}

export function validatePhone(phone, required = false) {
  if (!phone || typeof phone !== 'string') {
    return required ? 'Phone number is required' : null
  }
  const trimmed = phone.trim()
  if (!trimmed) return required ? 'Phone number is required' : null

  if (/[\r\n\x00-\x1f\x7f]/.test(trimmed)) return 'Phone number contains invalid characters'
  if (/[^\d\s\-().+]/.test(trimmed)) {
    return 'Phone number must contain only digits and valid phone formatting (+91, spaces, hyphens)'
  }

  const normalized = normalizePhone(trimmed)
  if (!INDIAN_MOBILE_REGEX.test(normalized)) {
    return 'Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9'
  }

  return null
}

export function validateEmail(email) {
  if (!email || typeof email !== 'string') return 'Email address is required'
  const trimmed = email.trim()
  if (!trimmed) return 'Email address is required'
  if (trimmed.length > EMAIL_MAX_LENGTH) return `Email cannot exceed ${EMAIL_MAX_LENGTH} characters`
  if (/[\r\n\x00-\x1f\x7f]/.test(trimmed)) return 'Email contains invalid characters'
  if (trimmed.includes(',') || trimmed.includes(';')) return 'Multiple email addresses are not permitted'
  if (/\s/.test(trimmed)) return 'Email must not contain spaces'
  if (!EMAIL_REGEX.test(trimmed)) return 'Please enter a valid email address (e.g. name@example.com)'
  return null
}

// Strict password validation for registration and password reset
export function validatePassword(password) {
  if (!password) return 'Password is required'
  if (password.length < 8) return 'Password must be at least 8 characters'
  if (password.length > PASSWORD_MAX_LENGTH) return `Password cannot exceed ${PASSWORD_MAX_LENGTH} characters`
  if (!/[A-Z]/.test(password)) return 'Password must include at least one uppercase letter'
  if (!/[a-z]/.test(password)) return 'Password must include at least one lowercase letter'
  if (!/[0-9]/.test(password)) return 'Password must include at least one number'
  return null
}

// Login password validation (does not enforce new complexity rules that could lock out valid accounts)
export function validateLoginPassword(password) {
  if (!password) return 'Password is required'
  if (password.length > PASSWORD_MAX_LENGTH) return `Password cannot exceed ${PASSWORD_MAX_LENGTH} characters`
  return null
}

export function validateAddress(address, required = false) {
  if (!address || typeof address !== 'string') {
    return required ? 'Address is required' : null
  }
  const trimmed = address.trim()
  if (!trimmed) return required ? 'Address is required' : null
  if (trimmed.length > ADDRESS_MAX_LENGTH) return `Address cannot exceed ${ADDRESS_MAX_LENGTH} characters`
  if (/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(trimmed)) return 'Address contains invalid control characters'
  return null
}

export function validatePincode(pincode) {
  if (!pincode || typeof pincode !== 'string') return 'PIN code is required'
  const trimmed = pincode.trim()
  if (!PINCODE_REGEX.test(trimmed)) {
    return 'Enter a valid 6-digit Indian PIN code'
  }
  return null
}

export function validateIndianState(state) {
  if (!state || typeof state !== 'string') return 'State is required'
  const trimmed = state.trim()
  if (!trimmed) return 'State is required'
  if (!isValidIndianState(trimmed)) {
    return 'Please select a valid Indian state or Union Territory'
  }
  return null
}

export function validateText(text, fieldName, min = 1, max = 500, required = true) {
  if (!text || typeof text !== 'string') {
    return required ? `${fieldName} is required` : null
  }
  const trimmed = text.trim()
  if (required && !trimmed) return `${fieldName} cannot be empty`
  if (trimmed.length < min) return `${fieldName} must be at least ${min} character(s)`
  if (trimmed.length > max) return `${fieldName} cannot exceed ${max} characters`
  if (/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(trimmed)) return `${fieldName} contains invalid characters`
  return null
}

// Compute password strength score (0: empty, 1: weak, 2: medium, 3: strong)
export function computePasswordStrength(password) {
  if (!password || password.length === 0) return { score: 0, label: '', percent: 0 }
  let points = 0
  if (password.length >= 8) points += 1
  if (password.length >= 12) points += 1
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) points += 1
  if (/[0-9]/.test(password)) points += 1
  if (/[^a-zA-Z0-9]/.test(password)) points += 1

  if (points <= 2) return { score: 1, label: 'Weak', percent: 33, color: '#ef4444' }
  if (points <= 4) return { score: 2, label: 'Medium', percent: 66, color: '#f59e0b' }
  return { score: 3, label: 'Strong', percent: 100, color: '#10b981' }
}

export function validateRecoveryCode(code) {
  if (!code || typeof code !== 'string') return 'Recovery code is required'
  const trimmed = code.trim().toUpperCase()
  if (!trimmed) return 'Recovery code is required'
  const cleaned = trimmed.replace(/[\s-]/g, '')
  const codeBody = cleaned.startsWith('CG') ? cleaned.slice(2) : cleaned
  if (codeBody.length !== 16) {
    return 'Recovery code must contain 16 characters (e.g. CG-XXXX-XXXX-XXXX-XXXX)'
  }
  if (!/^[0-9A-Z]+$/.test(codeBody)) {
    return 'Recovery code contains invalid characters'
  }
  return null
}

export function formatRecoveryCodeInput(value) {
  if (!value || typeof value !== 'string') return ''
  const cleaned = value.toUpperCase().replace(/[^0-9A-Z]/g, '')
  let rest = cleaned
  let prefix = ''
  if (rest.startsWith('CG')) {
    prefix = 'CG-'
    rest = rest.slice(2)
  }
  const parts = rest.match(/.{1,4}/g) || []
  return prefix + parts.join('-')
}

