import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  EMAIL_MAX_LENGTH,
  NAME_MAX_LENGTH,
  PASSWORD_MAX_LENGTH,
  computePasswordStrength,
  normalizePhone,
  validateAddress,
  validateEmail,
  validateFullName,
  validateLoginPassword,
  validatePassword,
  validatePhone,
  validatePincode,
  validateText,
} from '../utils/validators.js'

describe('Registration & Input Validation Engine', () => {
  describe('Full Name Validation', () => {
    it('accepts valid Indian and international names', () => {
      assert.equal(validateFullName('Aarav Sharma'), null)
      assert.equal(validateFullName('Priya Patel'), null)
      assert.equal(validateFullName('Dr. A. P. J. Abdul Kalam'), null)
      assert.equal(validateFullName("Jean-Luc O'Connor"), null)
      assert.equal(validateFullName('राजेश कुमार'), null)
    })

    it('rejects empty or whitespace-only names', () => {
      assert.match(validateFullName(''), /required/)
      assert.match(validateFullName('   '), /required/)
      assert.match(validateFullName(null), /required/)
    })

    it('rejects numbers and random special characters', () => {
      assert.match(validateFullName('John123'), /cannot contain numbers/)
      assert.match(validateFullName('Aarav 99'), /cannot contain numbers/)
      assert.match(validateFullName('!@#$%^&*'), /contain at least 2 letters/)
      assert.match(validateFullName('---'), /contain at least 2 letters/)
      assert.match(validateFullName('Aarav 😀'), /invalid characters/)
    })

    it('enforces 100-character and 101-character boundaries', () => {
      const valid100 = 'A' + 'a'.repeat(99)
      assert.equal(valid100.length, 100)
      assert.equal(validateFullName(valid100), null)

      const invalid101 = 'A' + 'a'.repeat(100)
      assert.equal(invalid101.length, 101)
      assert.match(validateFullName(invalid101), /cannot exceed 100 characters/)
    })

    it('enforces minimum 2 character length', () => {
      assert.match(validateFullName('A'), /at least 2 characters/)
    })
  })

  describe('Phone Number Validation & Normalization', () => {
    it('accepts valid 10-digit Indian numbers starting with 6, 7, 8, or 9', () => {
      assert.equal(validatePhone('9876543210'), null)
      assert.equal(validatePhone('8123456789'), null)
      assert.equal(validatePhone('7012345678'), null)
      assert.equal(validatePhone('6987654321'), null)
    })

    it('accepts numbers with +91, 0, spaces, and hyphens and normalizes correctly', () => {
      assert.equal(validatePhone('+91 98765 43210'), null)
      assert.equal(validatePhone('+91-98765-43210'), null)
      assert.equal(validatePhone('09876543210'), null)
      assert.equal(normalizePhone('+91 98765-43210'), '9876543210')
      assert.equal(normalizePhone('09876543210'), '9876543210')
    })

    it('allows empty optional phone field', () => {
      assert.equal(validatePhone('', false), null)
      assert.equal(validatePhone(null, false), null)
      assert.equal(validatePhone('   ', false), null)
    })

    it('rejects alphabetic characters and invalid symbols', () => {
      assert.match(validatePhone('98765abcde'), /only digits/)
      assert.match(validatePhone('98765@#4321'), /only digits/)
    })

    it('rejects numbers not starting with 6, 7, 8, 9 or of invalid length', () => {
      assert.match(validatePhone('1234567890'), /starting with 6, 7, 8, or 9/)
      assert.match(validatePhone('98765'), /starting with 6, 7, 8, or 9/)
      assert.match(validatePhone('987654321099'), /starting with 6, 7, 8, or 9/)
    })
  })

  describe('Email Validation', () => {
    it('accepts valid email addresses', () => {
      assert.equal(validateEmail('user@example.com'), null)
      assert.equal(validateEmail('test.name+tag@sub.domain.co.in'), null)
    })

    it('rejects invalid or dangerous email addresses', () => {
      assert.match(validateEmail(''), /required/)
      assert.match(validateEmail('user name@domain.com'), /spaces/)
      assert.match(validateEmail('user\r\n@domain.com'), /invalid/)
      assert.match(validateEmail('user1@a.com, user2@b.com'), /Multiple/)
      assert.match(validateEmail('not-an-email'), /valid email/)
    })

    it('enforces email length boundary (254 valid, 255 rejected)', () => {
      const local = 'a'.repeat(64)
      const domain = 'b'.repeat(60) + '.' + 'c'.repeat(60) + '.' + 'd'.repeat(63) + '.com'
      const email254 = `${local}@${domain}`
      assert.equal(email254.length, 254)
      assert.equal(validateEmail(email254), null)

      const email255 = 'a'.repeat(243) + '@example.com'
      assert.equal(email255.length, 255)
      assert.match(validateEmail(email255), /exceed 254 characters/)
    })
  })

  describe('Password Validation & Strength Policy', () => {
    it('accepts valid complex passwords', () => {
      assert.equal(validatePassword('StrongPass123'), null)
      assert.equal(validatePassword('P@ssw0rd!2026'), null)
    })

    it('rejects empty and weak passwords', () => {
      assert.match(validatePassword(''), /required/)
      assert.match(validatePassword('short1A'), /at least 8 characters/)
      assert.match(validatePassword('lowercase123'), /uppercase/)
      assert.match(validatePassword('UPPERCASE123'), /lowercase/)
      assert.match(validatePassword('NoNumbersHere'), /number/)
    })

    it('enforces password boundaries (128 valid, 129 rejected)', () => {
      const pw128 = 'P' + 'a'.repeat(125) + '1' + '!'
      assert.equal(pw128.length, 128)
      assert.equal(validatePassword(pw128), null)

      const pw129 = pw128 + 'x'
      assert.equal(pw129.length, 129)
      assert.match(validatePassword(pw129), /cannot exceed 128 characters/)
    })

    it('computes password strength accurately', () => {
      assert.equal(computePasswordStrength('').score, 0)
      assert.equal(computePasswordStrength('short').score, 1)
      assert.equal(computePasswordStrength('MediumPass1').score, 2)
      assert.equal(computePasswordStrength('VeryStrong@Pass123!').score, 3)
    })
  })

  describe('Address Validation', () => {
    it('accepts valid real-world addresses with numbers, letters and punctuation', () => {
      assert.equal(validateAddress('Flat 402, Sunshine Apts, M.G. Road, Pune - 411001'), null)
      assert.equal(validateAddress('#12/B, 3rd Cross, Indiranagar, Bengaluru'), null)
    })

    it('allows empty optional address', () => {
      assert.equal(validateAddress('', false), null)
      assert.equal(validateAddress(null, false), null)
      assert.equal(validateAddress('   ', false), null)
    })

    it('enforces 500-character boundary', () => {
      const valid500 = 'A'.repeat(500)
      assert.equal(validateAddress(valid500), null)

      const invalid501 = 'A'.repeat(501)
      assert.match(validateAddress(invalid501), /cannot exceed 500 characters/)
    })

    it('rejects control characters in address', () => {
      assert.match(validateAddress('Flat 101 \x00 NullByte St'), /invalid control characters/)
    })
  })
})
