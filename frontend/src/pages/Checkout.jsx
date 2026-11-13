import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  Edit3,
  MapPin,
  PackageCheck,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
  Truck,
  Zap,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import api, { getErrorMessage, resolveImageUrl } from '../services/api'
import { INDIAN_STATES } from '../utils/indianStates.js'
import {
  ADDRESS_MAX_LENGTH,
  EMAIL_MAX_LENGTH,
  NAME_MAX_LENGTH,
  PHONE_MAX_LENGTH,
  validateEmail,
  validateFullName,
  validateIndianState,
  validatePhone,
  validatePincode,
  validateText,
} from '../utils/validators.js'

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true)
      return
    }

    const existingScript = document.querySelector(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]',
    )
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(true))
      existingScript.addEventListener('error', () => resolve(false))
      return
    }

    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

function cleanOptionalText(value) {
  if (value === undefined || value === null) return null
  const cleaned = String(value).trim()
  return cleaned || null
}

function cleanOptionalDate(value) {
  if (!value) return null
  const cleaned = String(value).trim()
  return /^\d{4}-\d{2}-\d{2}$/.test(cleaned) ? cleaned : null
}

function prepareOrderItem(item) {
  const customization = item.customization || {}
  return {
    product_id: item.product.id,
    quantity: item.quantity,
    occasion: cleanOptionalText(customization.occasion),
    custom_text: cleanOptionalText(customization.custom_text),
    event_date: cleanOptionalDate(customization.event_date),
    custom_image_url: cleanOptionalText(customization.custom_image_url),
  }
}

// Checkout Step Constants
const STEP_ADDRESS = 1
const STEP_DELIVERY = 2
const STEP_PAYMENT = 3
const STEP_REVIEW = 4
const STEP_CONFIRMATION = 5

const STEPS = [
  { id: STEP_ADDRESS, label: 'Delivery Address' },
  { id: STEP_DELIVERY, label: 'Delivery Options' },
  { id: STEP_PAYMENT, label: 'Payment Method' },
  { id: STEP_REVIEW, label: 'Order Review' },
  { id: STEP_CONFIRMATION, label: 'Confirmation' },
]

export default function Checkout() {
  const { user } = useAuth()
  const { items, total, clearCart } = useCart()
  const navigate = useNavigate()
  const location = useLocation()

  const buyNowItem = location.state?.buyNowItem || null
  const isBuyNow = Boolean(buyNowItem)
  const checkoutItems = isBuyNow ? [buyNowItem] : items

  const itemsSubtotal = isBuyNow
    ? (Number(buyNowItem.product.price) || 0) * (Number(buyNowItem.quantity) || 1)
    : total

  // Stepper state
  const [currentStep, setCurrentStep] = useState(STEP_ADDRESS)

  // Saved Addresses state
  const [savedAddresses, setSavedAddresses] = useState([])
  const [loadingAddresses, setLoadingAddresses] = useState(true)
  const [selectedAddressId, setSelectedAddressId] = useState(null)
  const [showAddressForm, setShowAddressForm] = useState(false)
  const [editingAddressId, setEditingAddressId] = useState(null)

  // Delivery Option state ('standard' | 'express')
  const [deliveryOption, setDeliveryOption] = useState('standard')

  // Payment Method state ('cod' | 'razorpay')
  const [paymentMethod, setPaymentMethod] = useState('cod')

  // Address form fields
  const [addressForm, setAddressForm] = useState({
    full_name: user?.name || '',
    phone: user?.phone || '',
    email: user?.email || '',
    address_line1: user?.address || '',
    address_line2: '',
    landmark: '',
    city: '',
    state: '',
    pincode: '',
    save_to_account: true,
    is_default: false,
  })

  const [formErrors, setFormErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [busy, setBusy] = useState(false)
  const [paymentError, setPaymentError] = useState(null)
  const [pendingOrder, setPendingOrder] = useState(null)

  // Final placed order details for Step 5
  const [placedOrder, setPlacedOrder] = useState(null)

  // Calculate delivery fee
  const shippingFee = deliveryOption === 'express' ? 99 : 0
  const finalPayableTotal = itemsSubtotal + shippingFee

  // 1. Fetch saved addresses on mount
  useEffect(() => {
    let isMounted = true
    const fetchAddresses = async () => {
      try {
        setLoadingAddresses(true)
        const { data } = await api.get('/addresses')
        if (isMounted) {
          setSavedAddresses(data)
          if (data.length > 0) {
            const defaultAddr = data.find((a) => a.is_default) || data[0]
            setSelectedAddressId(defaultAddr.id)
            setShowAddressForm(false)
          } else {
            setShowAddressForm(true)
          }
        }
      } catch (err) {
        if (isMounted) {
          // If error fetching or none saved, default to showing address form
          setShowAddressForm(true)
        }
      } finally {
        if (isMounted) setLoadingAddresses(false)
      }
    }

    if (user) {
      fetchAddresses()
    }
    return () => {
      isMounted = false
    }
  }, [user])

  // Redirect if unauthenticated
  if (!user) {
    return <Navigate to="/login" state={{ from: '/checkout' }} replace />
  }

  // Redirect if empty checkout items and not on confirmation screen
  if (!checkoutItems.length && currentStep !== STEP_CONFIRMATION) {
    return <Navigate to="/cart" replace />
  }

  // Validation functions for Address Form
  const validateField = (key, value) => {
    switch (key) {
      case 'full_name':
        return validateFullName(value)
      case 'phone':
        return validatePhone(value, true)
      case 'email':
        return validateEmail(value)
      case 'address_line1':
        return validateText(value, 'Address line 1', 5, ADDRESS_MAX_LENGTH, true)
      case 'city':
        return validateText(value, 'City', 2, 100, true)
      case 'state':
        return validateIndianState(value)
      case 'pincode':
        return validatePincode(value)
      default:
        return null
    }
  }

  const handleBlur = (key) => {
    setTouched((prev) => ({ ...prev, [key]: true }))
    const err = validateField(key, addressForm[key])
    setFormErrors((prev) => ({ ...prev, [key]: err }))
  }

  const handleFieldChange = (key, value) => {
    setAddressForm((prev) => ({ ...prev, [key]: value }))
    if (touched[key]) {
      const err = validateField(key, value)
      setFormErrors((prev) => ({ ...prev, [key]: err }))
    }
  }

  // Active address object (either selected saved address or current form inputs)
  const getActiveAddress = () => {
    if (selectedAddressId && !showAddressForm) {
      const found = savedAddresses.find((a) => a.id === selectedAddressId)
      if (found) return found
    }
    return {
      full_name: addressForm.full_name,
      phone: addressForm.phone,
      email: addressForm.email,
      address_line1: addressForm.address_line1,
      address_line2: addressForm.address_line2,
      landmark: addressForm.landmark,
      city: addressForm.city,
      state: addressForm.state,
      pincode: addressForm.pincode,
    }
  }

  // Handle saving new or edited address to backend
  const handleSaveAddressToBackend = async () => {
    const nextErrors = {
      full_name: validateField('full_name', addressForm.full_name),
      phone: validateField('phone', addressForm.phone),
      email: validateField('email', addressForm.email),
      address_line1: validateField('address_line1', addressForm.address_line1),
      city: validateField('city', addressForm.city),
      state: validateField('state', addressForm.state),
      pincode: validateField('pincode', addressForm.pincode),
    }

    setFormErrors(nextErrors)
    setTouched({
      full_name: true,
      phone: true,
      email: true,
      address_line1: true,
      city: true,
      state: true,
      pincode: true,
    })

    if (Object.values(nextErrors).some(Boolean)) {
      toast.error('Please correct the highlighted fields in the address form')
      return false
    }

    setBusy(true)
    try {
      const payload = {
        full_name: addressForm.full_name.trim(),
        phone: addressForm.phone.trim(),
        email: addressForm.email.trim(),
        address_line1: addressForm.address_line1.trim(),
        address_line2: addressForm.address_line2.trim() || null,
        landmark: addressForm.landmark.trim() || null,
        city: addressForm.city.trim(),
        state: addressForm.state.trim(),
        pincode: addressForm.pincode.trim(),
        is_default: addressForm.is_default,
      }

      if (editingAddressId) {
        const { data: updated } = await api.put(`/addresses/${editingAddressId}`, payload)
        setSavedAddresses((prev) =>
          prev.map((a) => (a.id === updated.id ? updated : payload.is_default ? { ...a, is_default: false } : a)),
        )
        setSelectedAddressId(updated.id)
        toast.success('Address updated successfully')
      } else if (addressForm.save_to_account) {
        const { data: created } = await api.post('/addresses', payload)
        setSavedAddresses((prev) => (payload.is_default ? [created, ...prev.map((a) => ({ ...a, is_default: false }))] : [...prev, created]))
        setSelectedAddressId(created.id)
        toast.success('Address saved to your account')
      }

      setShowAddressForm(false)
      setEditingAddressId(null)
      return true
    } catch (err) {
      if (err.response?.status === 422 && Array.isArray(err.response?.data?.detail)) {
        const backendFieldErrors = {}
        for (const item of err.response.data.detail) {
          const fieldName = item.loc?.[item.loc.length - 1]
          if (fieldName && fieldName in addressForm) {
            backendFieldErrors[fieldName] = item.msg
          }
        }
        if (Object.keys(backendFieldErrors).length > 0) {
          setFormErrors((prev) => ({ ...prev, ...backendFieldErrors }))
        }
      }
      toast.error(getErrorMessage(err))
      return false
    } finally {
      setBusy(false)
    }
  }

  // Address Step: Proceed to Step 2
  const handleProceedFromAddress = async () => {
    if (showAddressForm) {
      const saved = await handleSaveAddressToBackend()
      if (!saved) return
    } else {
      if (!selectedAddressId) {
        toast.error('Please select a delivery address or add a new one')
        return
      }
    }
    setCurrentStep(STEP_DELIVERY)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Start editing saved address
  const handleStartEditAddress = (addr) => {
    setEditingAddressId(addr.id)
    setAddressForm({
      full_name: addr.full_name,
      phone: addr.phone,
      email: addr.email || user?.email || '',
      address_line1: addr.address_line1,
      address_line2: addr.address_line2 || '',
      landmark: addr.landmark || '',
      city: addr.city,
      state: addr.state,
      pincode: addr.pincode,
      save_to_account: true,
      is_default: addr.is_default,
    })
    setShowAddressForm(true)
  }

  // Delete saved address
  const handleDeleteAddress = async (id, e) => {
    e.stopPropagation()
    if (!window.confirm('Are you sure you want to delete this saved address?')) return
    try {
      await api.delete(`/addresses/${id}`)
      setSavedAddresses((prev) => prev.filter((a) => a.id !== id))
      if (selectedAddressId === id) {
        const remaining = savedAddresses.filter((a) => a.id !== id)
        if (remaining.length > 0) {
          setSelectedAddressId(remaining[0].id)
        } else {
          setSelectedAddressId(null)
          setShowAddressForm(true)
        }
      }
      toast.success('Address deleted')
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  // Set default address
  const handleSetDefaultAddress = async (id, e) => {
    e.stopPropagation()
    try {
      await api.post(`/addresses/${id}/default`)
      setSavedAddresses((prev) =>
        prev.map((a) => ({
          ...a,
          is_default: a.id === id,
        })),
      )
      toast.success('Default delivery address updated')
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  // Handle Online Payment (Razorpay Test Mode / Production)
  const finishPaidOrder = async (order, payment) => {
    if (payment.mode === 'demo') {
      await api.post('/payments/demo-complete', { order_id: order.id })
      if (!isBuyNow) clearCart()
      toast.success('Payment completed successfully!')
      setPendingOrder(null)
      setPaymentError(null)
      setPlacedOrder({ ...order, payment_status: 'PAID', order_status: 'CONFIRMED' })
      setCurrentStep(STEP_CONFIRMATION)
      return
    }

    const loaded = await loadRazorpayScript()
    if (!loaded) {
      throw new Error('Razorpay secure checkout could not be loaded. Please check your network connection.')
    }

    const activeAddr = getActiveAddress()

    await new Promise((resolve, reject) => {
      const checkout = new window.Razorpay({
        key: payment.key_id,
        amount: payment.amount,
        currency: payment.currency || 'INR',
        name: payment.business_name || 'CustomGift',
        description: `Order #${order.order_number}`,
        order_id: payment.razorpay_order_id,
        prefill: {
          name: activeAddr?.full_name || user.name,
          email: activeAddr?.email || user.email,
          contact: activeAddr?.phone || user.phone,
        },
        notes: {
          internal_order_id: String(order.id),
          order_number: order.order_number,
        },
        theme: {
          color: '#6366f1',
        },
        handler: async (response) => {
          try {
            await api.post('/payments/verify', {
              order_id: order.id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            })
            resolve({
              orderId: order.id,
              paymentId: response.razorpay_payment_id,
            })
          } catch (error) {
            reject(error)
          }
        },
        modal: {
          ondismiss: async () => {
            try {
              await api.post('/payments/fail', {
                order_id: order.id,
                razorpay_order_id: payment.razorpay_order_id,
                reason: 'cancelled',
              })
            } catch (_) {}
            setPendingOrder(order)
            setPaymentError(
              'Payment window was closed before completion. Your gifts remain safe in your cart. You can retry paying online or change your payment method below.'
            )
            toast.info('Payment was cancelled. You can retry whenever you are ready.')
            reject(new Error('PAYMENT_CANCELLED'))
          },
        },
      })

      // Register failure callback with Razorpay
      checkout.on('payment.failed', async (resp) => {
        try {
          await api.post('/payments/fail', {
            order_id: order.id,
            razorpay_order_id: resp.error?.metadata?.order_id || payment.razorpay_order_id,
            razorpay_payment_id: resp.error?.metadata?.payment_id,
            error_code: resp.error?.code,
            error_description: resp.error?.description,
            reason: 'failed',
          })
        } catch (_) {}
        setPendingOrder(order)
        setPaymentError(
          `Payment failed: ${resp.error?.description || 'Transaction declined by bank'}. Please retry or choose another payment method.`
        )
      })

      checkout.open()
    })

    if (!isBuyNow) clearCart()
    toast.success('Payment verified successfully!')
    setPendingOrder(null)
    setPaymentError(null)
    setPlacedOrder({ ...order, payment_status: 'PAID', order_status: 'CONFIRMED' })
    setCurrentStep(STEP_CONFIRMATION)
  }

  // Final Order Placement (from Step 4 Review)
  const handlePlaceOrder = async () => {
    if (busy) return

    const activeAddr = getActiveAddress()
    if (!activeAddr || !activeAddr.full_name || !activeAddr.phone || !activeAddr.address_line1) {
      toast.error('Delivery address details are incomplete. Please review step 1.')
      setCurrentStep(STEP_ADDRESS)
      return
    }

    setBusy(true)
    setPaymentError(null)

    try {
      let order = pendingOrder
      if (!order || paymentMethod === 'cod') {
        const orderPayload = {
          name: activeAddr.full_name.trim(),
          phone: activeAddr.phone.trim(),
          email: (activeAddr.email || user.email).trim().toLowerCase(),
          address: activeAddr.address_line1.trim(),
          address_line2: activeAddr.address_line2 ? activeAddr.address_line2.trim() : null,
          landmark: activeAddr.landmark ? activeAddr.landmark.trim() : null,
          city: activeAddr.city.trim(),
          state: activeAddr.state.trim(),
          pincode: activeAddr.pincode.trim(),
          delivery_option: deliveryOption,
          saved_address_id: selectedAddressId && !showAddressForm ? selectedAddressId : null,
          payment_method: paymentMethod,
          items: checkoutItems.map(prepareOrderItem),
        }

        const { data } = await api.post('/orders', orderPayload)
        order = data
      }

      if (paymentMethod === 'cod') {
        if (!isBuyNow) clearCart()
        toast.success('Order placed successfully!')
        setPendingOrder(null)
        setPlacedOrder(order)
        setCurrentStep(STEP_CONFIRMATION)
        return
      }

      // Online payment (Razorpay)
      const { data: payment } = await api.post('/payments/create-order', { order_id: order.id })
      await finishPaidOrder(order, payment)
    } catch (err) {
      if (err.message !== 'PAYMENT_CANCELLED') {
        toast.error(getErrorMessage(err))
      }
    } finally {
      setBusy(false)
    }
  }

  const activeAddr = getActiveAddress()

  return (
    <div className="page-section checkout-page">
      <div className="container">
        {/* Progress Stepper Indicator */}
        <div className="checkout-stepper-card">
          <div className="checkout-stepper-nodes">
            {STEPS.map((step, idx) => {
              const isPassed = currentStep > step.id
              const isCurrent = currentStep === step.id
              const isAccessible = currentStep >= step.id && currentStep !== STEP_CONFIRMATION

              return (
                <div
                  key={step.id}
                  className={`checkout-step-item ${isPassed ? 'completed' : ''} ${isCurrent ? 'active' : ''}`}
                >
                  <button
                    type="button"
                    className="checkout-step-node"
                    disabled={!isAccessible || step.id === STEP_CONFIRMATION}
                    onClick={() => isAccessible && setCurrentStep(step.id)}
                    aria-current={isCurrent ? 'step' : undefined}
                  >
                    <div className="node-circle">
                      {isPassed ? <Check size={16} strokeWidth={2.8} /> : <span>{step.id}</span>}
                    </div>
                    <span className="node-label">{step.label}</span>
                  </button>
                  {idx < STEPS.length - 1 && <div className={`stepper-connector ${isPassed ? 'filled' : ''}`} />}
                </div>
              )
            })}
          </div>
        </div>

        {/* STEP 5: ORDER CONFIRMATION VIEW */}
        {currentStep === STEP_CONFIRMATION && placedOrder && (
          <div className="checkout-confirmation-card">
            <div className="confirmation-header">
              <div className="confirmation-icon-wrap">
                <CheckCircle2 size={54} />
              </div>
              <span className="confirmation-eyebrow">
                {placedOrder.payment_status === 'PAID'
                  ? 'Payment Verified & Confirmed'
                  : 'Thank You For Your Order'}
              </span>
              <h1>Order Placed Successfully!</h1>
              <p>
                We have received your order <strong>{placedOrder.order_number}</strong>. A confirmation email has been
                sent to <strong>{placedOrder.email}</strong>.
              </p>
            </div>

            <div className="confirmation-meta-grid">
              <div className="meta-block">
                <span className="meta-label">Order Number</span>
                <strong className="meta-value">{placedOrder.order_number}</strong>
              </div>
              <div className="meta-block">
                <span className="meta-label">Order Date</span>
                <strong className="meta-value">
                  {new Date(placedOrder.created_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </strong>
              </div>
              <div className="meta-block">
                <span className="meta-label">Estimated Delivery</span>
                <strong className="meta-value highlight">{placedOrder.estimated_delivery || '4–6 Business Days'}</strong>
              </div>
              <div className="meta-block">
                <span className="meta-label">Payment Status</span>
                <span className={`payment-pill ${placedOrder.payment_status.toLowerCase()}`}>
                  {placedOrder.payment_status === 'PAID'
                    ? 'PAID ONLINE'
                    : placedOrder.payment_method === 'cod'
                      ? 'CASH ON DELIVERY (PENDING)'
                      : placedOrder.payment_status === 'FAILED'
                        ? 'PAYMENT FAILED'
                        : placedOrder.payment_status === 'CANCELLED'
                          ? 'PAYMENT CANCELLED'
                          : 'PAYMENT PENDING'}
                </span>
              </div>
              {placedOrder.payment_id && (
                <div className="meta-block">
                  <span className="meta-label">Razorpay Payment ID</span>
                  <strong className="meta-value" style={{ fontFamily: 'monospace' }}>
                    {placedOrder.payment_id}
                  </strong>
                </div>
              )}
            </div>

            <div className="confirmation-details-row">
              <div className="confirmation-box">
                <h3>Delivery Address</h3>
                <p>
                  <strong>{placedOrder.name}</strong>
                  <br />
                  {placedOrder.address}
                  {placedOrder.address_line2 ? `, ${placedOrder.address_line2}` : ''}
                  {placedOrder.landmark ? ` (Near ${placedOrder.landmark})` : ''}
                  <br />
                  {placedOrder.city}, {placedOrder.state} – {placedOrder.pincode}
                  <br />
                  Phone: {placedOrder.phone}
                </p>
              </div>

              <div className="confirmation-box">
                <h3>Order Total</h3>
                <div className="confirmation-total-stack">
                  <div className="sub-row">
                    <span>Items Total</span>
                    <span>₹{Number(placedOrder.subtotal || placedOrder.total_amount).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="sub-row">
                    <span>Shipping ({placedOrder.delivery_option === 'express' ? 'Express' : 'Standard'})</span>
                    <span>
                      {Number(placedOrder.shipping_fee) > 0
                        ? `₹${Number(placedOrder.shipping_fee).toLocaleString('en-IN')}`
                        : 'FREE'}
                    </span>
                  </div>
                  <div className="total-highlight-row">
                    <span>Grand Total</span>
                    <strong>₹{Number(placedOrder.total_amount).toLocaleString('en-IN')}</strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="confirmation-actions">
              <Link to={`/orders/${placedOrder.id}`} className="button button-primary">
                <PackageCheck size={18} /> View Order Details
              </Link>
              <Link to="/shop" className="button button-outline">
                Continue Shopping
              </Link>
            </div>
          </div>
        )}

        {/* STEPS 1-4: MAIN WORKFLOW WITH STICKY SUMMARY */}
        {currentStep !== STEP_CONFIRMATION && (
          <div className="checkout-layout">
            <div className="checkout-main">
              {/* STEP 1: DELIVERY ADDRESS */}
              {currentStep === STEP_ADDRESS && (
                <div className="checkout-card">
                  <div className="card-heading">
                    <MapPin size={22} />
                    <div>
                      <h2>1. Select Delivery Address</h2>
                      <p>Where should our artisans dispatch your handcrafted gift?</p>
                    </div>
                  </div>

                  {/* Saved addresses selector */}
                  {savedAddresses.length > 0 && !showAddressForm && (
                    <div className="saved-addresses-section">
                      <div className="saved-addresses-grid">
                        {savedAddresses.map((addr) => {
                          const isSelected = selectedAddressId === addr.id
                          return (
                            <div
                              key={addr.id}
                              className={`saved-address-card ${isSelected ? 'selected' : ''}`}
                              onClick={() => setSelectedAddressId(addr.id)}
                            >
                              <div className="address-card-header">
                                <label className="address-radio-label">
                                  <input
                                    type="radio"
                                    name="selected_address"
                                    checked={isSelected}
                                    onChange={() => setSelectedAddressId(addr.id)}
                                  />
                                  <strong>{addr.full_name}</strong>
                                </label>
                                {addr.is_default && <span className="default-address-pill">Default</span>}
                              </div>

                              <p className="address-text">
                                {addr.address_line1}
                                {addr.address_line2 ? `, ${addr.address_line2}` : ''}
                                {addr.landmark ? ` (Near: ${addr.landmark})` : ''}
                                <br />
                                {addr.city}, {addr.state} – <strong>{addr.pincode}</strong>
                              </p>
                              <p className="address-phone">Mobile: {addr.phone}</p>

                              <div className="address-card-actions">
                                <button
                                  type="button"
                                  className="action-link-btn"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleStartEditAddress(addr)
                                  }}
                                >
                                  <Edit3 size={13} /> Edit
                                </button>
                                {!addr.is_default && (
                                  <button
                                    type="button"
                                    className="action-link-btn"
                                    onClick={(e) => handleSetDefaultAddress(addr.id, e)}
                                  >
                                    Set as Default
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className="action-link-btn danger"
                                  onClick={(e) => handleDeleteAddress(addr.id, e)}
                                >
                                  <Trash2 size={13} /> Delete
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      <button
                        type="button"
                        className="button button-outline add-address-btn"
                        onClick={() => {
                          setEditingAddressId(null)
                          setAddressForm({
                            full_name: user?.name || '',
                            phone: user?.phone || '',
                            email: user?.email || '',
                            address_line1: '',
                            address_line2: '',
                            landmark: '',
                            city: '',
                            state: '',
                            pincode: '',
                            save_to_account: true,
                            is_default: false,
                          })
                          setShowAddressForm(true)
                        }}
                      >
                        <Plus size={16} /> Add New Address
                      </button>
                    </div>
                  )}

                  {/* Add / Edit Address Form */}
                  {showAddressForm && (
                    <div className="address-form-wrap">
                      <div className="form-subheading">
                        <h3>{editingAddressId ? 'Edit Delivery Address' : 'Enter Delivery Address'}</h3>
                        {savedAddresses.length > 0 && (
                          <button
                            type="button"
                            className="text-btn cancel-btn"
                            onClick={() => {
                              setShowAddressForm(false)
                              setEditingAddressId(null)
                            }}
                          >
                            Cancel
                          </button>
                        )}
                      </div>

                      <div className="form-grid two">
                        <label>
                          Full name <span className="req">*</span>
                          <input
                            required
                            maxLength={NAME_MAX_LENGTH}
                            value={addressForm.full_name}
                            onBlur={() => handleBlur('full_name')}
                            onChange={(e) => handleFieldChange('full_name', e.target.value)}
                            placeholder="Recipient's full name"
                          />
                          {touched.full_name && formErrors.full_name && (
                            <small className="field-error">{formErrors.full_name}</small>
                          )}
                        </label>

                        <label>
                          Mobile number <span className="req">*</span>
                          <input
                            type="tel"
                            required
                            maxLength={PHONE_MAX_LENGTH}
                            value={addressForm.phone}
                            onBlur={() => handleBlur('phone')}
                            onChange={(e) => handleFieldChange('phone', e.target.value)}
                            placeholder="10-digit mobile number"
                          />
                          {touched.phone && formErrors.phone && (
                            <small className="field-error">{formErrors.phone}</small>
                          )}
                        </label>
                      </div>

                      <label>
                        Email address <span className="req">*</span>
                        <input
                          type="email"
                          required
                          maxLength={EMAIL_MAX_LENGTH}
                          value={addressForm.email}
                          onBlur={() => handleBlur('email')}
                          onChange={(e) => handleFieldChange('email', e.target.value)}
                          placeholder="Email for tracking and invoice"
                        />
                        {touched.email && formErrors.email && (
                          <small className="field-error">{formErrors.email}</small>
                        )}
                      </label>

                      <label>
                        Address Line 1 (Flat, House no., Building, Apartment) <span className="req">*</span>
                        <input
                          required
                          maxLength={ADDRESS_MAX_LENGTH}
                          value={addressForm.address_line1}
                          onBlur={() => handleBlur('address_line1')}
                          onChange={(e) => handleFieldChange('address_line1', e.target.value)}
                          placeholder="e.g. Flat 402, Lotus Residency, MG Road"
                        />
                        {touched.address_line1 && formErrors.address_line1 && (
                          <small className="field-error">{formErrors.address_line1}</small>
                        )}
                      </label>

                      <div className="form-grid two">
                        <label>
                          Address Line 2 (Area, Street, Sector) <span className="optional">(Optional)</span>
                          <input
                            maxLength={ADDRESS_MAX_LENGTH}
                            value={addressForm.address_line2}
                            onChange={(e) => handleFieldChange('address_line2', e.target.value)}
                            placeholder="e.g. Shivaji Nagar, Kothrud"
                          />
                        </label>

                        <label>
                          Landmark <span className="optional">(Optional)</span>
                          <input
                            maxLength={150}
                            value={addressForm.landmark}
                            onChange={(e) => handleFieldChange('landmark', e.target.value)}
                            placeholder="e.g. Near City Hospital"
                          />
                        </label>
                      </div>

                      <div className="form-grid three">
                        <label>
                          City <span className="req">*</span>
                          <input
                            required
                            maxLength={100}
                            value={addressForm.city}
                            onBlur={() => handleBlur('city')}
                            onChange={(e) => handleFieldChange('city', e.target.value)}
                            placeholder="City / Town"
                          />
                          {touched.city && formErrors.city && (
                            <small className="field-error">{formErrors.city}</small>
                          )}
                        </label>

                        <label>
                          State / Union Territory <span className="req">*</span>
                          <select
                            required
                            value={addressForm.state}
                            onBlur={() => handleBlur('state')}
                            onChange={(e) => handleFieldChange('state', e.target.value)}
                          >
                            <option value="">Select State / UT</option>
                            {INDIAN_STATES.map((st) => (
                              <option key={st} value={st}>
                                {st}
                              </option>
                            ))}
                          </select>
                          {touched.state && formErrors.state && (
                            <small className="field-error">{formErrors.state}</small>
                          )}
                        </label>

                        <label>
                          PIN Code <span className="req">*</span>
                          <input
                            required
                            maxLength={6}
                            value={addressForm.pincode}
                            onBlur={() => handleBlur('pincode')}
                            onChange={(e) => handleFieldChange('pincode', e.target.value)}
                            placeholder="6-digit PIN"
                          />
                          {touched.pincode && formErrors.pincode && (
                            <small className="field-error">{formErrors.pincode}</small>
                          )}
                        </label>
                      </div>

                      <div className="address-checkboxes">
                        <label className="checkbox-row">
                          <input
                            type="checkbox"
                            checked={addressForm.save_to_account}
                            onChange={(e) => handleFieldChange('save_to_account', e.target.checked)}
                          />
                          <span>Save this address to my account for future orders</span>
                        </label>

                        <label className="checkbox-row">
                          <input
                            type="checkbox"
                            checked={addressForm.is_default}
                            onChange={(e) => handleFieldChange('is_default', e.target.checked)}
                          />
                          <span>Make this my default delivery address</span>
                        </label>
                      </div>
                    </div>
                  )}

                  <div className="checkout-step-nav single-right">
                    <button
                      type="button"
                      className="button button-primary"
                      disabled={busy}
                      onClick={handleProceedFromAddress}
                    >
                      Continue to Delivery Options
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: DELIVERY OPTIONS */}
              {currentStep === STEP_DELIVERY && (
                <div className="checkout-card">
                  <div className="card-heading">
                    <Truck size={22} />
                    <div>
                      <h2>2. Choose Delivery Speed</h2>
                      <p>Select your preferred shipping option for dispatch.</p>
                    </div>
                  </div>

                  <div className="delivery-options-grid">
                    <div
                      className={`delivery-option-card ${deliveryOption === 'standard' ? 'selected' : ''}`}
                      onClick={() => setDeliveryOption('standard')}
                    >
                      <div className="option-radio-col">
                        <input
                          type="radio"
                          name="delivery_option"
                          checked={deliveryOption === 'standard'}
                          onChange={() => setDeliveryOption('standard')}
                        />
                      </div>
                      <div className="option-info-col">
                        <div className="option-title-row">
                          <strong>Standard Insured Delivery</strong>
                          <span className="badge-free">FREE</span>
                        </div>
                        <p className="option-estimate">
                          <Clock size={14} /> Estimated Arrival: 4–6 Business Days
                        </p>
                        <p className="option-desc">
                          Standard reliable ground courier with real-time transit tracking and doorstep delivery.
                        </p>
                      </div>
                      <div className="option-price-col">
                        <strong>FREE</strong>
                      </div>
                    </div>

                    <div
                      className={`delivery-option-card ${deliveryOption === 'express' ? 'selected' : ''}`}
                      onClick={() => setDeliveryOption('express')}
                    >
                      <div className="option-radio-col">
                        <input
                          type="radio"
                          name="delivery_option"
                          checked={deliveryOption === 'express'}
                          onChange={() => setDeliveryOption('express')}
                        />
                      </div>
                      <div className="option-info-col">
                        <div className="option-title-row">
                          <strong>Express Priority Delivery</strong>
                          <span className="badge-speed">
                            <Zap size={12} /> EXPRESS
                          </span>
                        </div>
                        <p className="option-estimate">
                          <Clock size={14} /> Estimated Arrival: 2–3 Business Days
                        </p>
                        <p className="option-desc">
                          Priority crafting in our workshop with expedited air express dispatch.
                        </p>
                      </div>
                      <div className="option-price-col">
                        <strong>₹99</strong>
                      </div>
                    </div>
                  </div>

                  <div className="checkout-step-nav">
                    <button
                      type="button"
                      className="button button-outline"
                      onClick={() => setCurrentStep(STEP_ADDRESS)}
                    >
                      <ArrowLeft size={16} /> Back to Address
                    </button>
                    <button
                      type="button"
                      className="button button-primary"
                      onClick={() => setCurrentStep(STEP_PAYMENT)}
                    >
                      Continue to Payment Method
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: PAYMENT METHOD */}
              {currentStep === STEP_PAYMENT && (
                <div className="checkout-card">
                  <div className="card-heading">
                    <CreditCard size={22} />
                    <div>
                      <h2>3. Select Payment Method</h2>
                      <p>All payment methods are verified and encrypted.</p>
                    </div>
                  </div>

                  <div className="payment-options-grid">
                    <div
                      className={`payment-option-card ${paymentMethod === 'cod' ? 'selected' : ''}`}
                      onClick={() => setPaymentMethod('cod')}
                    >
                      <div className="payment-radio-row">
                        <input
                          type="radio"
                          name="payment_method"
                          checked={paymentMethod === 'cod'}
                          onChange={() => setPaymentMethod('cod')}
                        />
                        <strong>Cash on Delivery (COD)</strong>
                        <span className="badge-cod">Pay at Doorstep</span>
                      </div>
                      <p className="payment-desc">
                        Pay via Cash or scan courier UPI QR code when your package arrives at your delivery address.
                      </p>
                    </div>

                    <div
                      className={`payment-option-card ${paymentMethod === 'razorpay' ? 'selected' : ''}`}
                      onClick={() => setPaymentMethod('razorpay')}
                    >
                      <div className="payment-radio-row">
                        <input
                          type="radio"
                          name="payment_method"
                          checked={paymentMethod === 'razorpay'}
                          onChange={() => setPaymentMethod('razorpay')}
                        />
                        <strong>Pay Online – Secure Payment with Razorpay</strong>
                        <span className="badge-secure">
                          <ShieldCheck size={12} /> 100% Encrypted
                        </span>
                      </div>
                      <p className="payment-desc">
                        Official Razorpay checkout. Supports UPI (Google Pay, PhonePe, Paytm), Cards, Net Banking & Wallets:
                      </p>
                      <div className="payment-trust-logos">
                        <span>UPI</span>
                        <span>Debit Card</span>
                        <span>Credit Card</span>
                        <span>Net Banking</span>
                        <span>Wallets</span>
                      </div>
                    </div>
                  </div>

                  <div className="checkout-step-nav">
                    <button
                      type="button"
                      className="button button-outline"
                      onClick={() => setCurrentStep(STEP_DELIVERY)}
                    >
                      <ArrowLeft size={16} /> Back to Delivery
                    </button>
                    <button
                      type="button"
                      className="button button-primary"
                      onClick={() => setCurrentStep(STEP_REVIEW)}
                    >
                      Review Order Details
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 4: ORDER REVIEW */}
              {currentStep === STEP_REVIEW && (
                <div className="checkout-card">
                  <div className="card-heading">
                    <PackageCheck size={22} />
                    <div>
                      <h2>4. Review Your Order</h2>
                      <p>Verify your delivery address, shipping option and items before placing order.</p>
                    </div>
                  </div>

                  {/* Review summaries */}
                  <div className="review-blocks-stack">
                    <div className="review-block">
                      <div className="review-block-head">
                        <div className="head-title">
                          <MapPin size={16} />
                          <strong>Delivery Address</strong>
                        </div>
                        <button
                          type="button"
                          className="action-link-btn"
                          onClick={() => setCurrentStep(STEP_ADDRESS)}
                        >
                          Change
                        </button>
                      </div>
                      <p className="review-block-text">
                        <strong>{activeAddr?.full_name}</strong> • {activeAddr?.phone}
                        <br />
                        {activeAddr?.address_line1}
                        {activeAddr?.address_line2 ? `, ${activeAddr?.address_line2}` : ''}
                        {activeAddr?.landmark ? ` (Near ${activeAddr?.landmark})` : ''}
                        <br />
                        {activeAddr?.city}, {activeAddr?.state} – <strong>{activeAddr?.pincode}</strong>
                      </p>
                    </div>

                    <div className="review-block">
                      <div className="review-block-head">
                        <div className="head-title">
                          <Truck size={16} />
                          <strong>Delivery Option</strong>
                        </div>
                        <button
                          type="button"
                          className="action-link-btn"
                          onClick={() => setCurrentStep(STEP_DELIVERY)}
                        >
                          Change
                        </button>
                      </div>
                      <p className="review-block-text">
                        {deliveryOption === 'express' ? (
                          <>
                            <strong>Express Priority Delivery (₹99)</strong> — Estimated 2–3 Business Days
                          </>
                        ) : (
                          <>
                            <strong>Standard Insured Delivery (FREE)</strong> — Estimated 4–6 Business Days
                          </>
                        )}
                      </p>
                    </div>

                    <div className="review-block">
                      <div className="review-block-head">
                        <div className="head-title">
                          <CreditCard size={16} />
                          <strong>Payment Method</strong>
                        </div>
                        <button
                          type="button"
                          className="action-link-btn"
                          onClick={() => setCurrentStep(STEP_PAYMENT)}
                        >
                          Change
                        </button>
                      </div>
                      <p className="review-block-text">
                        {paymentMethod === 'cod' ? (
                          <strong>Cash on Delivery (Pay at Doorstep)</strong>
                        ) : (
                          <strong>UPI / Cards / Net Banking (Razorpay Secure Checkout)</strong>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Ordered Items Review List */}
                  <div className="review-items-section">
                    <h3>Items in Order ({checkoutItems.length})</h3>
                    <div className="review-items-list">
                      {checkoutItems.map((item) => (
                        <div key={item.id || item.product.id} className="review-item-row">
                          <img
                            src={resolveImageUrl(item.product.image_url)}
                            alt={item.product.title}
                            className="review-item-thumb"
                          />
                          <div className="review-item-info">
                            <strong>{item.product.title}</strong>
                            <span className="item-meta-category">{item.product.category}</span>
                            {item.customization?.occasion && (
                              <span className="item-customization-pill">
                                Occasion: {item.customization.occasion}
                              </span>
                            )}
                            {item.customization?.custom_text && (
                              <span className="item-customization-pill">
                                Message: &ldquo;{item.customization.custom_text}&rdquo;
                              </span>
                            )}
                            <div className="review-qty-price">
                              <span>Qty: {item.quantity}</span>
                              <span>×</span>
                              <span>₹{Number(item.product.price).toLocaleString('en-IN')}</span>
                            </div>
                          </div>
                          <div className="review-item-total">
                            <strong>₹{(Number(item.product.price) * item.quantity).toLocaleString('en-IN')}</strong>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {paymentError && (
                    <div className="payment-alert-box warning">
                      <AlertCircle size={20} />
                      <div>
                        <strong>Payment Not Completed</strong>
                        <p>{paymentError}</p>
                      </div>
                    </div>
                  )}

                  <div className="checkout-step-nav">
                    <button
                      type="button"
                      className="button button-outline"
                      disabled={busy}
                      onClick={() => setCurrentStep(STEP_PAYMENT)}
                    >
                      <ArrowLeft size={16} /> Back to Payment
                    </button>
                    <button
                      type="button"
                      className="button button-primary place-order-btn"
                      disabled={busy}
                      onClick={handlePlaceOrder}
                    >
                      {busy ? (
                        <>Processing Payment...</>
                      ) : paymentMethod === 'razorpay' ? (
                        pendingOrder ? (
                          <>
                            <CreditCard size={18} /> Retry Razorpay Payment (₹{finalPayableTotal.toLocaleString('en-IN')})
                          </>
                        ) : (
                          <>
                            <ShieldCheck size={18} /> Pay Online with Razorpay (₹{finalPayableTotal.toLocaleString('en-IN')})
                          </>
                        )
                      ) : (
                        <>
                          <ShieldCheck size={18} /> Place Order via COD (₹{finalPayableTotal.toLocaleString('en-IN')})
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Sticky Order Summary Sidebar */}
            <aside className="checkout-summary">
              <h3>Order Summary</h3>
              <div className="summary-items-preview">
                {checkoutItems.map((item) => (
                  <div key={item.id || item.product.id} className="checkout-line">
                    <img src={resolveImageUrl(item.product.image_url)} alt={item.product.title} />
                    <span>
                      <strong className="summary-item-title">{item.product.title}</strong>
                      <small>Qty: {item.quantity}</small>
                    </span>
                    <strong>₹{(Number(item.product.price) * item.quantity).toLocaleString('en-IN')}</strong>
                  </div>
                ))}
              </div>

              <div className="summary-divider" />

              <div className="summary-row">
                <span>Items Subtotal</span>
                <span>₹{itemsSubtotal.toLocaleString('en-IN')}</span>
              </div>

              <div className="summary-row">
                <span>Delivery Charges</span>
                <span>
                  {shippingFee > 0 ? (
                    `₹${shippingFee.toLocaleString('en-IN')}`
                  ) : (
                    <strong className="green-text">FREE</strong>
                  )}
                </span>
              </div>

              <div className="summary-row grand">
                <strong>Total Payable</strong>
                <strong>₹{finalPayableTotal.toLocaleString('en-IN')}</strong>
              </div>

              <div className="checkout-security">
                <span>
                  <ShieldCheck size={15} /> 256-Bit SSL Secure Checkout
                </span>
                <span>
                  <Sparkles size={15} /> 100% Handcrafted Guarantee
                </span>
                <span>
                  <Truck size={15} /> Insured Pan-India Delivery
                </span>
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  )
}
