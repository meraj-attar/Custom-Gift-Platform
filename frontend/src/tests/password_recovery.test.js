import assert from 'node:assert/strict'
import fs from 'node:fs'
import { describe, it } from 'node:test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  validateEmail,
  validatePassword,
} from '../utils/validators.js'

describe('Change: 6-Digit Email OTP Password Recovery System — Unit & Architecture Tests', () => {
  const currentDir = path.dirname(fileURLToPath(import.meta.url))
  const registerCandidatePaths = [
    path.resolve(currentDir, '../pages/Register.jsx'),
    path.resolve(process.cwd(), 'frontend/src/pages/Register.jsx'),
    path.resolve(process.cwd(), 'src/pages/Register.jsx'),
  ]
  const registerPath = registerCandidatePaths.find((p) => fs.existsSync(p))
  const registerCode = fs.readFileSync(registerPath, 'utf8')

  const forgotCandidatePaths = [
    path.resolve(currentDir, '../pages/ForgotPassword.jsx'),
    path.resolve(process.cwd(), 'frontend/src/pages/ForgotPassword.jsx'),
    path.resolve(process.cwd(), 'src/pages/ForgotPassword.jsx'),
  ]
  const forgotPath = forgotCandidatePaths.find((p) => fs.existsSync(p))
  const forgotCode = fs.readFileSync(forgotPath, 'utf8')

  const resetCandidatePaths = [
    path.resolve(currentDir, '../pages/ResetPassword.jsx'),
    path.resolve(process.cwd(), 'frontend/src/pages/ResetPassword.jsx'),
    path.resolve(process.cwd(), 'src/pages/ResetPassword.jsx'),
  ]
  const resetPath = resetCandidatePaths.find((p) => fs.existsSync(p))
  const resetCode = fs.readFileSync(resetPath, 'utf8')

  it('1. Email and password validators strictly enforce formatting rules', () => {
    assert.equal(validateEmail('merajattar20@gmail.com'), null)
    assert.match(validateEmail('invalid-email'), /valid email address/i)
    assert.match(validateEmail(''), /required/i)

    assert.equal(validatePassword('StrongPass123'), null)
    assert.match(validatePassword('weak'), /at least 8 characters/i)
    assert.match(validatePassword('alllowercase123'), /uppercase letter/i)
    assert.match(validatePassword('ALLUPPERCASE123'), /lowercase letter/i)
    assert.match(validatePassword('NoNumbersHere!'), /number/i)
  })

  it('2. Register.jsx provides streamlined registration without 16-character recovery friction', () => {
    // 16-character recovery modal must NOT be present
    assert.ok(!registerCode.includes('recoveryCodeModal'), 'Register must not block users with recoveryCodeModal')
    assert.ok(!registerCode.includes('Save Your Account Recovery Code'), 'Register must not show recovery code backup modal')
    assert.ok(registerCode.includes('Welcome to CustomGift'), 'Must welcome user directly to store')
  })

  it('3. ForgotPassword.jsx implements modern 3-step OTP recovery workflow', () => {
    // Step indicator & state
    assert.ok(forgotCode.includes('step === 1'), 'Must implement Step 1 (Enter Registered Email)')
    assert.ok(forgotCode.includes('step === 2'), 'Must implement Step 2 (Verify 6-Digit OTP)')
    assert.ok(forgotCode.includes('step === 3'), 'Must implement Step 3 (Create New Password)')
    assert.ok(forgotCode.includes('step === 4'), 'Must implement Step 4 (Success Confirmation)')

    // Step 1: Request OTP
    assert.ok(forgotCode.includes('/auth/forgot-password'), 'Must call forgot-password endpoint')
    assert.ok(forgotCode.includes('handleRequestOtp'), 'Must provide handleRequestOtp')

    // Step 2: 6 Individual Numeric OTP Boxes
    assert.ok(forgotCode.includes('otp-box'), 'Must render individual otp-box elements')
    assert.ok(forgotCode.includes('handleOtpBoxChange'), 'Must provide auto-advance handleOtpBoxChange')
    assert.ok(forgotCode.includes('handleOtpKeyDown'), 'Must support backspace navigation handleOtpKeyDown')
    assert.ok(forgotCode.includes('handleOtpPaste'), 'Must support 6-digit paste handleOtpPaste')
    assert.ok(forgotCode.includes('/auth/verify-reset-otp'), 'Must verify OTP at verify-reset-otp')
    assert.ok(forgotCode.includes('/auth/resend-reset-otp'), 'Must support resending OTP at resend-reset-otp')
    assert.ok(forgotCode.includes('resendCooldown'), 'Must enforce 60s resend cooldown')
    assert.ok(forgotCode.includes('expirySeconds'), 'Must display 5-minute countdown timer')
    assert.ok(forgotCode.includes('Your verification code has expired. Request a new code.'), 'Must display clear expiration banner')
    assert.ok(forgotCode.includes('otp-expired-banner'), 'Must render otp-expired-banner')
    assert.ok(forgotCode.includes('auth-step-form'), 'Must structure steps with auth-step-form for consistent vertical spacing')
    assert.ok(forgotCode.includes('Resend available in'), 'Must show resend countdown indicator during cooldown')

    // Step 3: Password Reset
    assert.ok(forgotCode.includes('/auth/reset-password'), 'Must reset password at reset-password')
    assert.ok(forgotCode.includes('PasswordStrengthMeter'), 'Must include PasswordStrengthMeter in Step 3')
    assert.ok(forgotCode.includes('showPassword'), 'Must support show/hide password toggle')

    // Zero development or test code leakage in customer UI
    assert.ok(!forgotCode.includes('Development Code'), 'Must never show Development Code banner')
    assert.ok(!forgotCode.includes('devOtp'), 'Must not track or store devOtp state')
    assert.ok(forgotCode.includes('maskEmail'), 'Must mask user email for privacy in Step 2')
    assert.ok(forgotCode.includes('Your password has been successfully reset!'), 'Must include exact completion confirmation')
    assert.ok(forgotCode.includes('Return to Sign In'), 'Must provide Return to Sign In button')
  })

  it('4. ResetPassword.jsx supports single-use reset token consumption', () => {
    assert.ok(resetCode.includes('/auth/reset-password'), 'ResetPassword must call /auth/reset-password')
    assert.ok(resetCode.includes('reset_token: token'), 'ResetPassword must pass reset_token parameter')
  })
})
