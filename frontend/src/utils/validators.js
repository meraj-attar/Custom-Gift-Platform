// Comprehensive client-side validators mirroring backend rules

export const EMAIL_MAX_LENGTH = 320
export const PHONE_MAX_LENGTH = 15
export const PINCODE_LENGTH = 6
export const NAME_MAX_LENGTH = 100
export const ADDRESS_MAX_LENGTH = 500
export const MESSAGE_MAX_LENGTH = 4000

// Standards-aware RFC email regex (rejects control characters, newlines, multiple addresses)
export const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/

// Indian mobile phone: optional +91 or 0 prefix followed by 10 digits starting with 6-9
// Or standard E.164 (8-15 digits)
export const PHONE_REGEX = /^(?:\+91|0)?[6-9]\d{9}$/
export const E164_PHONE_REGEX = /^\+?[1-9]\d{7,14}$/

// Indian 6-digit postal code (PIN)
export const PINCODE_REGEX = /^[1-9]\d{5}$/

export function validateEmail(email) {
  if (!email || typeof email !== 'string') return 'Email address is required'
  const trimmed = email.trim()
  if (!trimmed) return 'Email address cannot be empty'
  if (trimmed.length > EMAIL_MAX_LENGTH) return `Email cannot exceed ${EMAIL_MAX_LENGTH} characters`
  if (/[\r\n\x00-\x1f\x7f]/.test(trimmed)) return 'Email contains invalid characters'
  if (trimmed.includes(',') || trimmed.includes(';')) return 'Multiple email addresses are not permitted'
  if (/\s/.test(trimmed)) return 'Email must not contain spaces'
  if (!EMAIL_REGEX.test(trimmed)) return 'Please enter a valid email address (e.g. name@example.com)'
  return null
}

export function validatePhone(phone, required = false) {
  if (!phone || typeof phone !== 'string') {
    return required ? 'Phone number is required' : null
  }
  const trimmed = phone.trim()
  if (!trimmed) return required ? 'Phone number is required' : null
  const cleaned = trimmed.replace(/[\s\-().]/g, '')
  if (!PHONE_REGEX.test(cleaned) && !E164_PHONE_REGEX.test(cleaned)) {
    return 'Enter a valid 10-digit Indian mobile number (e.g. 9876543210)'
  }
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

export function validatePassword(password) {
  if (!password) return 'Password is required'
  if (password.length < 8) return 'Password must be at least 8 characters'
  if (password.length > 128) return 'Password cannot exceed 128 characters'
  if (!/[A-Z]/.test(password)) return 'Password must include at least one uppercase letter'
  if (!/[a-z]/.test(password)) return 'Password must include at least one lowercase letter'
  if (!/[0-9]/.test(password)) return 'Password must include at least one number'
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
