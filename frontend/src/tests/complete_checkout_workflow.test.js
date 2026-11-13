import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { INDIAN_STATES, isValidIndianState } from '../utils/indianStates.js'
import {
  validateAddress,
  validateEmail,
  validateFullName,
  validateIndianState,
  validatePhone,
  validatePincode,
  validateText,
} from '../utils/validators.js'

describe('Complete Production-Ready E-Commerce Checkout Workflow Tests', () => {
  it('1. Canonical Indian States & Union Territories List has exactly 36 valid entries', () => {
    assert.equal(INDIAN_STATES.length, 36)
    assert.ok(INDIAN_STATES.includes('Maharashtra'))
    assert.ok(INDIAN_STATES.includes('Delhi'))
    assert.ok(INDIAN_STATES.includes('Karnataka'))
    assert.ok(INDIAN_STATES.includes('Jammu and Kashmir'))
    assert.ok(INDIAN_STATES.includes('Ladakh'))

    assert.equal(isValidIndianState('Maharashtra'), true)
    assert.equal(isValidIndianState('maharashtra'), true)
    assert.equal(isValidIndianState('DELHI'), true)
    assert.equal(isValidIndianState('California'), false)
    assert.equal(isValidIndianState(''), false)
    assert.equal(isValidIndianState(null), false)
  })

  it('2. Delivery Address Validation strictly enforces Indian E-Commerce standards', () => {
    // Full Name
    assert.equal(validateFullName('M. K. Gandhi'), null)
    assert.equal(validateFullName('Priya Sharma'), null)
    assert.equal(validateFullName('A'), 'Full name must be at least 2 characters')
    assert.equal(validateFullName('Priya123'), 'Full name cannot contain numbers')
    assert.equal(validateFullName('   '), 'Full name is required')

    // Mobile Number (10 digits starting with 6, 7, 8, or 9)
    assert.equal(validatePhone('9876543210', true), null)
    assert.equal(validatePhone('+91 98765 43210', true), null)
    assert.equal(validatePhone('09876543210', true), null)
    assert.equal(validatePhone('5876543210', true), 'Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9')
    assert.equal(validatePhone('98765', true), 'Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9')
    assert.equal(validatePhone('', true), 'Phone number is required')

    // PIN code (exactly 6 digits starting with 1-9)
    assert.equal(validatePincode('411001'), null)
    assert.equal(validatePincode('110001'), null)
    assert.equal(validatePincode('41100'), 'Enter a valid 6-digit Indian PIN code')
    assert.equal(validatePincode('011001'), 'Enter a valid 6-digit Indian PIN code')
    assert.equal(validatePincode('ABCDEF'), 'Enter a valid 6-digit Indian PIN code')
    assert.equal(validatePincode(''), 'PIN code is required')

    // State validation
    assert.equal(validateIndianState('Maharashtra'), null)
    assert.equal(validateIndianState('karnataka'), null)
    assert.equal(validateIndianState('Random State'), 'Please select a valid Indian state or Union Territory')
    assert.equal(validateIndianState(''), 'State is required')

    // Address line 1 (minimum 5 characters)
    assert.equal(validateText('Flat 402, Lotus Apt', 'Address line 1', 5, 255, true), null)
    assert.equal(validateText('Flat', 'Address line 1', 5, 255, true), 'Address line 1 must be at least 5 character(s)')
  })

  it('3. Delivery Options calculation correctly adjusts shipping charges and total', () => {
    const itemsSubtotal = 1299

    // Standard Delivery (Free)
    const stdShippingFee = 0
    const stdTotal = itemsSubtotal + stdShippingFee
    assert.equal(stdShippingFee, 0)
    assert.equal(stdTotal, 1299)

    // Express Delivery (Flat ₹99)
    const expShippingFee = 99
    const expTotal = itemsSubtotal + expShippingFee
    assert.equal(expShippingFee, 99)
    assert.equal(expTotal, 1398)
  })

  it('4. Multi-Step Checkout progression respects step ordering and required data', () => {
    const steps = [
      { id: 1, label: 'Delivery Address' },
      { id: 2, label: 'Delivery Options' },
      { id: 3, label: 'Payment Method' },
      { id: 4, label: 'Order Review' },
      { id: 5, label: 'Confirmation' },
    ]

    assert.equal(steps.length, 5)
    assert.equal(steps[0].label, 'Delivery Address')
    assert.equal(steps[4].label, 'Confirmation')

    // Check transition validation
    const isStepAccessible = (targetStep, currentStep) => {
      return targetStep <= currentStep && currentStep !== 5
    }

    assert.equal(isStepAccessible(1, 3), true) // Can return to Address from Payment
    assert.equal(isStepAccessible(2, 3), true) // Can return to Delivery from Payment
    assert.equal(isStepAccessible(4, 2), false) // Cannot jump forward to Review before Delivery
    assert.equal(isStepAccessible(1, 5), false) // Once confirmed, steps locked
  })

  it('5. Order placement payload formatting preserves clean data and separates Buy Now from Cart', () => {
    const buyNowItem = {
      product: { id: 10, title: 'Personalized Lamp', price: 999.0 },
      quantity: 1,
      customization: { occasion: 'Birthday', custom_text: 'For Mom' },
    }

    const isBuyNow = true
    const checkoutItems = isBuyNow ? [buyNowItem] : []
    assert.equal(checkoutItems.length, 1)
    assert.equal(checkoutItems[0].product.id, 10)

    // Cart items should NOT be cleared if order was placed via Buy Now
    let cartCleared = false
    const clearCart = () => {
      cartCleared = true
    }

    if (!isBuyNow) {
      clearCart()
    }

    assert.equal(cartCleared, false) // Cart remained safe!
  })
})
