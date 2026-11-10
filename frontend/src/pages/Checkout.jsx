import {
  CreditCard,
  MapPin,
  PackageCheck,
  ShieldCheck,
  Truck,
} from 'lucide-react'

import { useState } from 'react'
import toast from 'react-hot-toast'
import {
  Navigate,
  useNavigate,
} from 'react-router-dom'

import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'

import api, {
  getErrorMessage,
  resolveImageUrl,
} from '../services/api'
import {
  ADDRESS_MAX_LENGTH,
  EMAIL_MAX_LENGTH,
  NAME_MAX_LENGTH,
  PHONE_MAX_LENGTH,
  validateEmail,
  validatePhone,
  validatePincode,
  validateText,
} from '../utils/validators'


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
      existingScript.addEventListener(
        'load',
        () => resolve(true),
      )

      existingScript.addEventListener(
        'error',
        () => resolve(false),
      )

      return
    }

    const script = document.createElement('script')

    script.src =
      'https://checkout.razorpay.com/v1/checkout.js'

    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)

    document.body.appendChild(script)
  })
}


function cleanOptionalText(value) {
  if (
    value === undefined ||
    value === null
  ) {
    return null
  }

  const cleaned = String(value).trim()

  return cleaned || null
}


function prepareOrderItem(item) {
  const customization =
    item.customization || {}

  return {
    product_id: item.product.id,
    quantity: item.quantity,

    occasion: cleanOptionalText(
      customization.occasion,
    ),

    custom_text: cleanOptionalText(
      customization.custom_text,
    ),

    // IMPORTANT:
    // FastAPI expects a date or null.
    // Never send an empty string "".
    event_date:
      cleanOptionalText(
        customization.event_date,
      ),

    custom_image_url:
      cleanOptionalText(
        customization.custom_image_url,
      ),
  }
}


export default function Checkout() {
  const { user } = useAuth()

  const {
    items,
    total,
    clearCart,
  } = useCart()

  const navigate = useNavigate()

  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    email: user?.email || '',
    address: user?.address || '',
    city: '',
    state: '',
    pincode: '',
    payment_method: 'cod',
  })

  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [busy, setBusy] = useState(false)

  if (!items.length) {
    return (
      <Navigate
        to="/cart"
        replace
      />
    )
  }

  const validateField = (key, value) => {
    switch (key) {
      case 'name':
        return validateText(value, 'Full name', 2, NAME_MAX_LENGTH, true)
      case 'phone':
        return validatePhone(value, true)
      case 'email':
        return validateEmail(value)
      case 'address':
        return validateText(value, 'Address', 5, ADDRESS_MAX_LENGTH, true)
      case 'city':
        return validateText(value, 'City', 2, 100, true)
      case 'state':
        return validateText(value, 'State', 2, 100, true)
      case 'pincode':
        return validatePincode(value)
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
    setForm((current) => ({
      ...current,
      [key]: value,
    }))
    if (touched[key]) {
      const err = validateField(key, value)
      setErrors((prev) => ({ ...prev, [key]: err }))
    }
  }


  const finishPaidOrder = async (
    order,
    payment,
  ) => {
    if (payment.mode === 'demo') {
      await api.post(
        '/payments/demo-complete',
        {
          order_id: order.id,
        },
      )

      clearCart()

      toast.success(
        'Demo payment completed',
      )

      navigate(
        `/orders/${order.id}`,
      )

      return
    }

    const loaded =
      await loadRazorpayScript()

    if (!loaded) {
      throw new Error(
        'Razorpay checkout could not be loaded',
      )
    }

    await new Promise(
      (resolve, reject) => {
        const checkout =
          new window.Razorpay({
            key: payment.key_id,

            amount:
              payment.amount,

            currency:
              payment.currency,

            name:
              'CustomGift',

            description:
              `Payment for ${order.order_number}`,

            order_id:
              payment.razorpay_order_id,

            prefill: {
              name: form.name,
              email: form.email,
              contact: form.phone,
            },

            theme: {
              color: '#6d3df5',
            },

            handler: async (
              response,
            ) => {
              try {
                await api.post(
                  '/payments/verify',
                  {
                    order_id:
                      order.id,

                    razorpay_order_id:
                      response.razorpay_order_id,

                    razorpay_payment_id:
                      response.razorpay_payment_id,

                    razorpay_signature:
                      response.razorpay_signature,
                  },
                )

                resolve()
              } catch (error) {
                reject(error)
              }
            },

            modal: {
              ondismiss: () =>
                reject(
                  new Error(
                    'Payment window closed',
                  ),
                ),
            },
          })

        checkout.open()
      },
    )

    clearCart()

    toast.success(
      'Payment verified',
    )

    navigate(
      `/orders/${order.id}`,
    )
  }


  const submit = async (event) => {
    event.preventDefault()

    if (busy) {
      return
    }

    const nextErrors = {
      name: validateField('name', form.name),
      phone: validateField('phone', form.phone),
      email: validateField('email', form.email),
      address: validateField('address', form.address),
      city: validateField('city', form.city),
      state: validateField('state', form.state),
      pincode: validateField('pincode', form.pincode),
    }

    setErrors(nextErrors)
    setTouched({
      name: true,
      phone: true,
      email: true,
      address: true,
      city: true,
      state: true,
      pincode: true,
    })

    if (Object.values(nextErrors).some(Boolean)) {
      toast.error('Please correct the highlighted errors in your delivery details')
      return
    }

    setBusy(true)

    try {
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        pincode: form.pincode.trim(),

        payment_method:
          form.payment_method,

        items:
          items.map(
            prepareOrderItem,
          ),
      }

      const { data: order } =
        await api.post(
          '/orders',
          payload,
        )

      if (
        form.payment_method ===
        'cod'
      ) {
        clearCart()

        toast.success(
          'Order placed successfully',
        )

        navigate(
          `/orders/${order.id}`,
        )

        return
      }

      const { data: payment } =
        await api.post(
          '/payments/create',
          {
            order_id:
              order.id,
          },
        )

      await finishPaidOrder(
        order,
        payment,
      )
    } catch (error) {
      toast.error(
        getErrorMessage(error),
      )
    } finally {
      setBusy(false)
    }
  }


  return (
    <div className="page-section checkout-page">
      <div className="container">

        <div className="page-hero compact align-left">
          <span className="eyebrow">
            Secure checkout
          </span>

          <h1>
            Almost ready to make their day
          </h1>

          <p>
            Your pricing is recalculated on
            the server before the order is
            created.
          </p>
        </div>


        <form
          className="checkout-layout"
          onSubmit={submit}
        >

          <div className="checkout-main">

            {/* Delivery Details */}
            <section className="checkout-card">

              <div className="card-heading">
                <MapPin />

                <div>
                  <h2>
                    Delivery details
                  </h2>

                  <p>
                    Where should we send your
                    personalized gifts?
                  </p>
                </div>
              </div>


              <div className="form-grid two">

                <label>
                  Full name

                  <input
                    required
                    maxLength={NAME_MAX_LENGTH}
                    value={form.name}
                    onBlur={() => handleBlur('name')}
                    onChange={(event) =>
                      field(
                        'name',
                        event.target.value,
                      )
                    }
                    placeholder="Receiver's full name"
                  />
                  {touched.name && errors.name && <small className="field-error">{errors.name}</small>}
                </label>


                <label>
                  Phone

                  <input
                    type="tel"
                    required
                    maxLength={PHONE_MAX_LENGTH}
                    value={form.phone}
                    onBlur={() => handleBlur('phone')}
                    onChange={(event) =>
                      field(
                        'phone',
                        event.target.value,
                      )
                    }
                    placeholder="10-digit mobile"
                  />
                  {touched.phone && errors.phone && <small className="field-error">{errors.phone}</small>}
                </label>

              </div>


              <label>
                Email

                <input
                  type="email"
                  required
                  maxLength={EMAIL_MAX_LENGTH}
                  value={form.email}
                  onBlur={() => handleBlur('email')}
                  onChange={(event) =>
                    field(
                      'email',
                      event.target.value,
                    )
                  }
                  placeholder="Order updates email"
                />
                {touched.email && errors.email && <small className="field-error">{errors.email}</small>}
              </label>


              <label>
                Address

                <textarea
                  required
                  maxLength={ADDRESS_MAX_LENGTH}
                  value={form.address}
                  onBlur={() => handleBlur('address')}
                  onChange={(event) =>
                    field(
                      'address',
                      event.target.value,
                    )
                  }
                  placeholder="House/Flat, Street, Landmark"
                />
                {touched.address && errors.address && <small className="field-error">{errors.address}</small>}
              </label>


              <div className="form-grid three">

                <label>
                  City

                  <input
                    required
                    maxLength={100}
                    value={form.city}
                    onBlur={() => handleBlur('city')}
                    onChange={(event) =>
                      field(
                        'city',
                        event.target.value,
                      )
                    }
                    placeholder="City"
                  />
                  {touched.city && errors.city && <small className="field-error">{errors.city}</small>}
                </label>


                <label>
                  State

                  <input
                    required
                    maxLength={100}
                    value={form.state}
                    onBlur={() => handleBlur('state')}
                    onChange={(event) =>
                      field(
                        'state',
                        event.target.value,
                      )
                    }
                    placeholder="State"
                  />
                  {touched.state && errors.state && <small className="field-error">{errors.state}</small>}
                </label>


                <label>
                  PIN code

                  <input
                    required
                    maxLength={6}
                    value={form.pincode}
                    onBlur={() => handleBlur('pincode')}
                    onChange={(event) =>
                      field(
                        'pincode',
                        event.target.value,
                      )
                    }
                    placeholder="6-digit PIN"
                  />
                  {touched.pincode && errors.pincode && <small className="field-error">{errors.pincode}</small>}
                </label>

              </div>

            </section>


            {/* Payment */}
            <section className="checkout-card">

              <div className="card-heading">
                <CreditCard />

                <div>
                  <h2>
                    Payment
                  </h2>

                  <p>
                    Choose a payment method.
                  </p>
                </div>
              </div>


              <div className="payment-options">

                <label
                  className={
                    form.payment_method ===
                    'cod'
                      ? 'selected'
                      : ''
                  }
                >
                  <input
                    type="radio"
                    name="payment"
                    value="cod"
                    checked={
                      form.payment_method ===
                      'cod'
                    }
                    onChange={() =>
                      field(
                        'payment_method',
                        'cod',
                      )
                    }
                  />

                  <span>
                    <strong>
                      Cash on delivery
                    </strong>

                    <small>
                      Pay when your order
                      arrives
                    </small>
                  </span>
                </label>


                <label
                  className={
                    form.payment_method ===
                    'razorpay'
                      ? 'selected'
                      : ''
                  }
                >
                  <input
                    type="radio"
                    name="payment"
                    value="razorpay"
                    checked={
                      form.payment_method ===
                      'razorpay'
                    }
                    onChange={() =>
                      field(
                        'payment_method',
                        'razorpay',
                      )
                    }
                  />

                  <span>
                    <strong>
                      Razorpay
                    </strong>

                    <small>
                      UPI, cards and net
                      banking · verified
                      server-side
                    </small>
                  </span>
                </label>

              </div>

            </section>

          </div>


          {/* Order Summary */}
          <aside className="checkout-summary">

            <h3>
              Your order
            </h3>


            {items.map((item) => (
              <div
                className="checkout-line"
                key={item.cartId}
              >
                <img
                  src={resolveImageUrl(
                    item.product.image_url,
                  )}
                  alt={item.product.title}
                />

                <span>
                  <strong>
                    {item.product.title}
                  </strong>

                  <small>
                    Qty {item.quantity}

                    {item.product.customizable
                      ? ' · Personalized'
                      : ''}
                  </small>
                </span>

                <b>
                  ₹
                  {(
                    Number(
                      item.product.price,
                    ) *
                    item.quantity
                  ).toLocaleString(
                    'en-IN',
                  )}
                </b>
              </div>
            ))}


            <div className="summary-divider" />


            <div className="summary-row">
              <span>
                Subtotal
              </span>

              <strong>
                ₹
                {total.toLocaleString(
                  'en-IN',
                )}
              </strong>
            </div>


            <div className="summary-row">
              <span>
                Shipping
              </span>

              <strong>
                Free
              </strong>
            </div>


            <div className="summary-row grand">
              <span>
                Total
              </span>

              <strong>
                ₹
                {total.toLocaleString(
                  'en-IN',
                )}
              </strong>
            </div>


            <button
              type="submit"
              className="button button-lg full"
              disabled={busy}
            >
              <PackageCheck size={18} />

              {busy
                ? 'Processing...'
                : form.payment_method ===
                    'cod'
                  ? 'Place order'
                  : 'Continue to payment'}
            </button>


            <div className="checkout-security">

              <span>
                <ShieldCheck />
                Protected order ownership
              </span>

              <span>
                <Truck />
                Track every order stage
              </span>

            </div>

          </aside>

        </form>

      </div>
    </div>
  )
}