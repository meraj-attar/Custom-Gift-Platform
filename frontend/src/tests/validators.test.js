import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  validateEmail,
  validatePassword,
  validatePhone,
  validatePincode,
  validateText,
} from '../utils/validators.js'

describe('Frontend Validation Engine', () => {
  it('validates correct email addresses', () => {
    assert.equal(validateEmail('user@example.com'), null)
    assert.equal(validateEmail('test.name+tag@sub.domain.co.in'), null)
  })

  it('rejects invalid or dangerous email addresses', () => {
    assert.match(validateEmail(''), /required/)
    assert.match(validateEmail('user name@domain.com'), /spaces/)
    assert.match(validateEmail('user\r\n@domain.com'), /invalid/)
    assert.match(validateEmail('user1@a.com, user2@b.com'), /Multiple/)
    assert.match(validateEmail('not-an-email'), /valid email/)
    assert.match(validateEmail('a'.repeat(321) + '@example.com'), /exceed/)
  })

  it('validates Indian and international phone numbers', () => {
    assert.equal(validatePhone('9876543210', true), null)
    assert.equal(validatePhone('+919876543210', true), null)
    assert.equal(validatePhone('+14155552671', true), null)
    assert.match(validatePhone('12345', true), /valid 10-digit/)
    assert.match(validatePhone('98765abcde', true), /valid 10-digit/)
  })

  it('validates 6-digit Indian PIN codes', () => {
    assert.equal(validatePincode('411001'), null)
    assert.equal(validatePincode('110001'), null)
    assert.match(validatePincode('011001'), /valid 6-digit/)
    assert.match(validatePincode('41100'), /valid 6-digit/)
    assert.match(validatePincode('41100A'), /valid 6-digit/)
  })

  it('validates password complexity', () => {
    assert.equal(validatePassword('StrongPass123'), null)
    assert.match(validatePassword('short1A'), /at least 8 characters/)
    assert.match(validatePassword('lowercase123'), /uppercase/)
    assert.match(validatePassword('UPPERCASE123'), /lowercase/)
    assert.match(validatePassword('NoNumbersHere'), /number/)
  })

  it('validates text bounds and controls', () => {
    assert.equal(validateText('Valid Name', 'Name', 2, 50), null)
    assert.match(validateText('A', 'Name', 2, 50), /at least 2/)
    assert.match(validateText('A'.repeat(51), 'Name', 2, 50), /cannot exceed 50/)
  })
})
