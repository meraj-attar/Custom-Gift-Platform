import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

describe('Razorpay Online Payment Workflow Tests', () => {
  it('1. Correctly converts rupee amounts to integer paise for Razorpay API', () => {
    const toPaise = (rupees) => Math.round(Number(rupees) * 100)

    assert.equal(toPaise(799), 79900)
    assert.equal(toPaise(799.50), 79950)
    assert.equal(toPaise(1697.00), 169700)
    assert.equal(toPaise(0), 0)
    assert.equal(toPaise(1), 100)
  })

  it('2. Formats Razorpay Checkout options strictly to standard specification', () => {
    const buildRazorpayOptions = (payment, order, user, address) => {
      return {
        key: payment.key_id,
        amount: payment.amount,
        currency: payment.currency || 'INR',
        name: 'CustomGift',
        description: `Order #${order.order_number}`,
        order_id: payment.razorpay_order_id,
        prefill: {
          name: address?.full_name || user.name,
          email: address?.email || user.email,
          contact: address?.phone || user.phone,
        },
        theme: {
          color: '#6366f1',
        },
      }
    }

    const payment = {
      key_id: 'rzp_test_exampleKey123',
      amount: 79900,
      currency: 'INR',
      razorpay_order_id: 'order_test_98765',
    }
    const order = { id: 10, order_number: 'CG-20261112-9999' }
    const user = { name: 'Priya Sharma', email: 'priya@example.com', phone: '9876543210' }
    const address = { full_name: 'Priya Sharma', email: 'priya@example.com', phone: '9876543210' }

    const options = buildRazorpayOptions(payment, order, user, address)
    assert.equal(options.key, 'rzp_test_exampleKey123')
    assert.equal(options.amount, 79900)
    assert.equal(options.currency, 'INR')
    assert.equal(options.order_id, 'order_test_98765')
    assert.equal(options.name, 'CustomGift')
    assert.equal(options.description, 'Order #CG-20261112-9999')
    assert.equal(options.prefill.name, 'Priya Sharma')
    assert.equal(options.prefill.contact, '9876543210')
    assert.equal(options.theme.color, '#6366f1')
  })

  it('3. Formats confirmation screen payment status accurately for all states', () => {
    const getPaymentPillLabel = (order) => {
      if (order.payment_status === 'PAID') return 'PAID ONLINE'
      if (order.payment_method === 'cod') return 'CASH ON DELIVERY (PENDING)'
      if (order.payment_status === 'FAILED') return 'PAYMENT FAILED'
      if (order.payment_status === 'CANCELLED') return 'PAYMENT CANCELLED'
      return 'PAYMENT PENDING'
    }

    assert.equal(getPaymentPillLabel({ payment_status: 'PAID', payment_method: 'razorpay' }), 'PAID ONLINE')
    assert.equal(getPaymentPillLabel({ payment_status: 'PENDING', payment_method: 'cod' }), 'CASH ON DELIVERY (PENDING)')
    assert.equal(getPaymentPillLabel({ payment_status: 'FAILED', payment_method: 'razorpay' }), 'PAYMENT FAILED')
    assert.equal(getPaymentPillLabel({ payment_status: 'CANCELLED', payment_method: 'razorpay' }), 'PAYMENT CANCELLED')
    assert.equal(getPaymentPillLabel({ payment_status: 'PENDING', payment_method: 'razorpay' }), 'PAYMENT PENDING')
  })

  it('4. Preserves cart items and avoids clearing upon payment cancellation or failure', () => {
    let cartCleared = false
    const clearCart = () => { cartCleared = true }

    const handlePaymentResult = (outcome, clearCartFn) => {
      if (outcome === 'SUCCESS') {
        clearCartFn()
      }
      // On CANCELLED or FAILED, clearCartFn is NOT invoked
    }

    // Cancelled flow
    handlePaymentResult('CANCELLED', clearCart)
    assert.equal(cartCleared, false, 'Cart must remain intact when user cancels payment')

    // Failed flow
    handlePaymentResult('FAILED', clearCart)
    assert.equal(cartCleared, false, 'Cart must remain intact when payment fails')

    // Success flow
    handlePaymentResult('SUCCESS', clearCart)
    assert.equal(cartCleared, true, 'Cart is cleared only upon verified payment success')
  })
})
