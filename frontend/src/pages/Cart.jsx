import {
  ArrowRight,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import EmptyState from '../components/EmptyState'
import WhatsAppIcon from '../components/WhatsAppIcon'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { resolveImageUrl } from '../services/api'
import { getProductWhatsAppUrl } from '../utils/whatsapp'

export default function Cart() {
  const { user } = useAuth()
  const {
    items,
    subtotal,
    totalDiscount,
    shippingCharge,
    total,
    updateQuantity,
    removeItem,
  } = useCart()

  if (!user) {
    return (
      <div className="page-section">
        <div className="container">
          <EmptyState
            title="Sign in to view your gift bag"
            text="Your saved gifts and personalized selections are kept safe in your account."
            action="Sign In"
            to="/login"
          />
        </div>
      </div>
    )
  }

  if (!items.length) {
    return (
      <div className="page-section">
        <div className="container">
          <EmptyState
            title="Your gift bag is empty"
            text="Find something meaningful and make it personal."
            action="Explore Gifts"
            to="/shop"
          />
        </div>
      </div>
    )
  }

  const shippingLabel = shippingCharge > 0 ? `₹${shippingCharge.toLocaleString('en-IN')}` : 'Free'

  return (
    <div className="page-section">
      <div className="container">
        <div className="page-hero compact align-left">
          <span className="eyebrow">Your selection</span>
          <h1>Gift bag</h1>
          <p>Review your selected gifts before checkout.</p>
        </div>

        <div className="cart-layout">
          <div className="cart-items">
            {items.map((item) => {
              const originalPrice =
                item.product.discount_percent > 0
                  ? Math.round(
                      Number(item.product.price) / (1 - item.product.discount_percent / 100)
                    )
                  : null

              return (
                <article
                  className="cart-item"
                  key={item.cartId}
                  data-testid={`cart-item-${item.cartId}`}
                >
                  <img
                    src={resolveImageUrl(item.product.image_url)}
                    alt={item.product.title}
                    className="cart-item-image"
                  />

                  <div className="cart-item-main">
                    <div className="cart-item-header">
                      <div>
                        <span className="cart-category">{item.product.category}</span>
                        <Link to={`/products/${item.product.slug}`} className="cart-item-title-link">
                          <h3>{item.product.title}</h3>
                        </Link>
                      </div>
                      <div className="cart-item-pricing">
                        <strong className="cart-price">
                          ₹{(Number(item.product.price) * item.quantity).toLocaleString('en-IN')}
                        </strong>
                        <small className="cart-unit-price">
                          ₹{Number(item.product.price).toLocaleString('en-IN')} each
                          {originalPrice && (
                            <span className="original-strikethrough">
                              ₹{originalPrice.toLocaleString('en-IN')}
                            </span>
                          )}
                        </small>
                      </div>
                    </div>

                    <div className="cart-customization-note">
                      <a
                        href={getProductWhatsAppUrl(item.product)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="cart-whatsapp-pill"
                        title="Contact us on WhatsApp for customization"
                      >
                        <WhatsAppIcon size={14} />
                        <span>Customize on WhatsApp</span>
                      </a>
                    </div>

                    <div className="cart-item-actions">
                      <div className="quantity-control small">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.cartId, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          aria-label="Decrease quantity"
                        >
                          <Minus size={14} />
                        </button>
                        <span>{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(
                              item.cartId,
                              Math.min(
                                Math.min(10, Number(item.product?.stock) || 10),
                                item.quantity + 1
                              )
                            )
                          }
                          disabled={item.quantity >= (Number(item.product?.stock) || 10)}
                          aria-label="Increase quantity"
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                      <button
                        type="button"
                        className="danger-text remove-item-btn"
                        onClick={() => removeItem(item.cartId)}
                        aria-label={`Remove ${item.product.title} from gift bag`}
                      >
                        <Trash2 size={16} /> Remove
                      </button>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>

          <aside className="order-summary">
            <ShoppingBag />
            <h3>Order summary</h3>

            {totalDiscount > 0 && (
              <div className="summary-discount-banner">
                <span>Total savings</span>
                <strong>-₹{totalDiscount.toLocaleString('en-IN')}</strong>
              </div>
            )}

            <div>
              <span>Subtotal</span>
              <strong>₹{subtotal.toLocaleString('en-IN')}</strong>
            </div>

            <div>
              <span>Shipping</span>
              <strong>{shippingLabel}</strong>
            </div>

            <div className="summary-total">
              <span>Total</span>
              <strong>₹{total.toLocaleString('en-IN')}</strong>
            </div>

            <p className="summary-tax-note">
              Taxes, if applicable, are included in the displayed total.
            </p>

            <Link className="button button-lg full" to="/checkout">
              Continue to checkout <ArrowRight size={17} />
            </Link>

            <Link className="text-link center" to="/shop">
              Continue shopping
            </Link>
          </aside>
        </div>
      </div>
    </div>
  )
}
