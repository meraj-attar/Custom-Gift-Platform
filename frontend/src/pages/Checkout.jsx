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

  const [busy, setBusy] =
    useState(false)

  if (!items.length) {
    return (
      <Navigate
        to="/cart"
        replace
      />
    )
  }

  const field = (
    key,
    value,
  ) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }))
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
                    value={form.name}
                    onChange={(event) =>
                      field(
                        'name',
                        event.target.value,
                      )
                    }
                  />
                </label>


                <label>
                  Phone

                  <input
                    required
                    value={form.phone}
                    onChange={(event) =>
                      field(
                        'phone',
                        event.target.value,
                      )
                    }
                  />
                </label>

              </div>


              <label>
                Email

                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(event) =>
                    field(
                      'email',
                      event.target.value,
                    )
                  }
                />
              </label>


              <label>
                Address

                <textarea
                  required
                  value={form.address}
                  onChange={(event) =>
                    field(
                      'address',
                      event.target.value,
                    )
                  }
                />
              </label>


              <div className="form-grid three">

                <label>
                  City

                  <input
                    required
                    value={form.city}
                    onChange={(event) =>
                      field(
                        'city',
                        event.target.value,
                      )
                    }
                  />
                </label>


                <label>
                  State

                  <input
                    required
                    value={form.state}
                    onChange={(event) =>
                      field(
                        'state',
                        event.target.value,
                      )
                    }
                  />
                </label>


                <label>
                  PIN code

                  <input
                    required
                    value={form.pincode}
                    onChange={(event) =>
                      field(
                        'pincode',
                        event.target.value,
                      )
                    }
                  />
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