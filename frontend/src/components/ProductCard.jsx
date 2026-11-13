import {
  Heart,
  ShoppingBag,
  Star,
  Zap,
} from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import WhatsAppIcon from '../components/WhatsAppIcon'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { useWishlist } from '../context/WishlistContext'
import { getErrorMessage, resolveImageUrl } from '../services/api'
import { getProductWhatsAppUrl } from '../utils/whatsapp'

export default function ProductCard({ product }) {
  const { user } = useAuth()
  const { addItem } = useCart()
  const { toggle, isWishlisted, isPending } = useWishlist()
  const navigate = useNavigate()
  const location = useLocation()
  const [isAdding, setIsAdding] = useState(false)
  const saved = isWishlisted(product.id)
  const pending = isPending(product.id)

  const isOutOfStock = Number(product.stock) <= 0
  const isLowStock = !isOutOfStock && Number(product.stock) <= 5
  const originalPrice =
    product.discount_percent > 0
      ? Math.round(Number(product.price) / (1 - product.discount_percent / 100))
      : null

  const onWishlist = async () => {
    if (!user) {
      toast.error('Sign in to save gifts to your wishlist')
      navigate('/login', { state: { from: `${location.pathname}${location.search}` } })
      return
    }
    if (pending) return
    try {
      const nowSaved = await toggle(product)
      toast.success(nowSaved ? 'Saved to your wishlist' : 'Removed from your wishlist')
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  const handleOrderNow = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (isOutOfStock) {
      toast.error('This gift is currently out of stock')
      return
    }

    if (!user) {
      toast.error('Please sign in to order gifts')
      navigate('/login', {
        state: {
          from: '/checkout',
          orderNowItem: { product, quantity: 1, customization: {} },
        },
      })
      return
    }

    // Add item to cart and navigate to checkout
    addItem({ product, quantity: 1, customization: {} })
    navigate('/checkout')
  }

  const handleAddToCart = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (isOutOfStock) {
      toast.error('This gift is currently out of stock')
      return
    }

    if (!user) {
      toast.error('Please sign in to add gifts to your gift bag')
      navigate('/login', { state: { from: `${location.pathname}${location.search}` } })
      return
    }

    if (isAdding) return

    setIsAdding(true)
    addItem({ product, quantity: 1, customization: {} })

    toast(
      (t) => (
        <div className="cart-toast-box">
          <span>Added to your gift bag!</span>
          <button
            type="button"
            className="cart-toast-action"
            onClick={() => {
              toast.dismiss(t.id)
              navigate('/cart')
            }}
          >
            View Gift Bag
          </button>
        </div>
      ),
      {
        id: `cart-add-${product.id}`,
        duration: 4000,
      }
    )

    setTimeout(() => {
      setIsAdding(false)
    }, 400)
  }

  return (
    <article className="product-card" data-testid={`product-card-${product.id}`}>
      <div className="product-image-wrap">
        <Link to={`/products/${product.slug}`} className="product-image-link">
          <img
            src={resolveImageUrl(product.image_url)}
            alt={product.title}
            className="product-image"
            loading="lazy"
            decoding="async"
          />
          {product.discount_percent > 0 && (
            <span className="discount-pill">-{product.discount_percent}%</span>
          )}
          {isOutOfStock ? (
            <span className="stock-pill out-of-stock">Out of stock</span>
          ) : isLowStock ? (
            <span className="stock-pill low-stock">Only {product.stock} left</span>
          ) : null}
        </Link>
        <button
          type="button"
          className={`heart-button ${saved ? 'active' : ''}`}
          aria-label={saved ? `Remove ${product.title} from wishlist` : `Save ${product.title} to wishlist`}
          aria-pressed={saved}
          disabled={pending}
          onClick={onWishlist}
        >
          <Heart size={18} fill={saved ? 'currentColor' : 'none'} />
        </button>
      </div>

      <div className="product-card-body">
        <div className="product-meta">
          <span className="product-category-name">{product.category}</span>
          <span className="rating" aria-label={`Rated ${product.rating} out of 5 stars`}>
            <Star size={14} fill="currentColor" /> {product.rating}
          </span>
        </div>

        <Link to={`/products/${product.slug}`} className="product-title-link">
          <h3>{product.title}</h3>
        </Link>

        <div className="product-pricing-row">
          <div className="price-stack">
            <strong className="current-price">₹{Number(product.price).toLocaleString('en-IN')}</strong>
            {originalPrice && (
              <span className="original-price" aria-label={`Original price ₹${originalPrice}`}>
                ₹{originalPrice.toLocaleString('en-IN')}
              </span>
            )}
          </div>
        </div>

        {/* Unified 3-Action Horizontal Row: WhatsApp (Icon) + Order Now (Primary/Grow) + Add to Bag (Icon) */}
        <div className="product-card-actions">
          <a
            className="product-action-btn product-whatsapp-btn"
            href={getProductWhatsAppUrl(product)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Contact on WhatsApp for ${product.title}`}
            title="Contact on WhatsApp"
            data-testid={`whatsapp-link-${product.id}`}
          >
            <WhatsAppIcon size={18} />
          </a>
          <button
            type="button"
            className="product-action-btn product-order-btn"
            disabled={isOutOfStock}
            onClick={handleOrderNow}
            aria-label={
              isOutOfStock
                ? 'Out of stock'
                : `Order now: ${product.title}`
            }
            title={isOutOfStock ? 'Out of stock' : `Order now: ${product.title}`}
            data-testid={`order-now-btn-${product.id}`}
          >
            <Zap size={14} /> <span>Order Now</span>
          </button>
          <button
            type="button"
            className="product-action-btn product-bag-btn"
            disabled={isOutOfStock || isAdding}
            onClick={handleAddToCart}
            aria-label={`Add ${product.title} to gift bag`}
            title="Add to Gift Bag"
            data-testid={`add-to-bag-btn-${product.id}`}
          >
            <ShoppingBag size={16} />
          </button>
        </div>
      </div>
    </article>
  )
}
