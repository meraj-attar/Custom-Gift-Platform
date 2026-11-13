import {
  CheckCircle2,
  Heart,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Star,
  Truck,
  Zap,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Link, useNavigate, useParams } from 'react-router-dom'
import WhatsAppIcon from '../components/WhatsAppIcon'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { useWishlist } from '../context/WishlistContext'
import api, { getErrorMessage, resolveImageUrl } from '../services/api'
import { getProductWhatsAppUrl } from '../utils/whatsapp'

export default function ProductDetails() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { addItem } = useCart()
  const { toggle: toggleWishlist, isWishlisted, isPending } = useWishlist()

  const [product, setProduct] = useState(null)
  const [quantity, setQuantity] = useState(1)

  useEffect(() => {
    api
      .get(`/products/${slug}`)
      .then(({ data }) => {
        setProduct(data)
      })
      .catch(() => navigate('/shop'))
  }, [slug, navigate])

  const handleAddToCart = () => {
    if (!user) {
      toast.error('Please sign in to add gifts to your gift bag')
      navigate('/login', { state: { from: `/products/${slug}` } })
      return
    }

    addItem({ product, quantity, customization: {} })
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
  }

  const handleOrderNow = () => {
    if (product.stock < 1) {
      toast.error('This gift is currently out of stock')
      return
    }

    if (!user) {
      toast.error('Please sign in to order gifts')
      navigate('/login', {
        state: {
          from: '/checkout',
          orderNowItem: { product, quantity, customization: {} },
        },
      })
      return
    }

    addItem({ product, quantity, customization: {} })
    navigate('/checkout')
  }

  const saveGift = async () => {
    if (!user) {
      toast.error('Sign in to save gifts to your wishlist')
      navigate('/login', { state: { from: `/products/${slug}` } })
      return
    }
    if (isPending(product.id)) return
    try {
      const saved = await toggleWishlist(product)
      toast.success(saved ? 'Saved to your wishlist' : 'Removed from your wishlist')
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  if (!product) {
    return (
      <div className="page-loader">
        <span className="spinner" />
      </div>
    )
  }

  const originalPrice =
    product.discount_percent > 0
      ? Math.round(Number(product.price) / (1 - product.discount_percent / 100))
      : null

  const whatsappUrl = getProductWhatsAppUrl(product)

  return (
    <div className="page-section">
      <div className="container product-detail-grid">
        <div className="detail-image-panel">
          <div className="detail-image">
            <img
              src={resolveImageUrl(product.image_url)}
              alt={product.title}
              loading="lazy"
            />
          </div>
          <div className="detail-trust">
            <span>
              <ShieldCheck /> Quality handcrafted
            </span>
            <span>
              <Truck /> {product.delivery_time || '3-5 business days'}
            </span>
          </div>
        </div>

        <div className="detail-content">
          <Link className="breadcrumb" to={`/shop?category=${encodeURIComponent(product.category)}`}>
            Shop / {product.category}
          </Link>
          <div className="detail-rating">
            <Star size={16} fill="currentColor" /> {product.rating}{' '}
            <span>• Loved by gift-givers</span>
          </div>
          <h1>{product.title}</h1>
          <div className="detail-price">
            <strong>₹{Number(product.price).toLocaleString('en-IN')}</strong>
            {originalPrice && (
              <span
                className="original-price"
                style={{
                  textDecoration: 'line-through',
                  opacity: 0.6,
                  fontSize: '18px',
                  marginLeft: '10px',
                }}
              >
                ₹{originalPrice.toLocaleString('en-IN')}
              </span>
            )}
            {product.discount_percent > 0 && <span>{product.discount_percent}% off</span>}
          </div>
          <p className="detail-description">{product.description}</p>
          <div className="detail-facts">
            <span>
              <strong>Material</strong>
              {product.material || 'Premium finish'}
            </span>
            <span>
              <strong>Stock</strong>
              {product.stock > 0 ? `${product.stock} available` : 'Sold out'}
            </span>
          </div>

          {/* Dedicated WhatsApp Customization Section */}
          <div className="product-whatsapp-card">
            <div className="whatsapp-card-info">
              <span className="whatsapp-eyebrow">
                <WhatsAppIcon size={16} /> Customization Inquiry
              </span>
              <h3>Want this gift personalized?</h3>
              <p>
                Connect directly with our team on WhatsApp to share your photos, custom text,
                special dates, or discuss bespoke design options.
              </p>
            </div>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="button button-lg product-whatsapp-cta-btn"
              data-testid="product-whatsapp-btn"
              aria-label="For Customization, Contact Us on WhatsApp"
            >
              <WhatsAppIcon size={20} />
              <span>For Customization, Contact Us on WhatsApp</span>
            </a>
          </div>

          <div className="buy-row">
            <div className="quantity-control">
              <button
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                aria-label="Decrease quantity"
              >
                <Minus size={16} />
              </button>
              <span>{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity(Math.min(Math.min(10, product.stock), quantity + 1))}
                aria-label="Increase quantity"
              >
                <Plus size={16} />
              </button>
            </div>

            <button
              type="button"
              className="button button-lg button-primary grow"
              disabled={product.stock < 1}
              onClick={handleOrderNow}
            >
              <Zap size={18} /> {product.stock < 1 ? 'Out of stock' : 'Order Now'}
            </button>

            <button
              type="button"
              className="button button-outline button-lg"
              disabled={product.stock < 1}
              onClick={handleAddToCart}
            >
              <ShoppingBag size={18} /> Add to Bag
            </button>

            <button
              type="button"
              className={`detail-wishlist-button ${isWishlisted(product.id) ? 'active' : ''}`}
              disabled={isPending(product.id)}
              onClick={saveGift}
              aria-label={
                isWishlisted(product.id) ? 'Remove from wishlist' : 'Save to wishlist'
              }
            >
              <Heart size={20} fill={isWishlisted(product.id) ? 'currentColor' : 'none'} />
            </button>
          </div>

          <div className="mini-assurances">
            <span>
              <CheckCircle2 /> Server-calculated secure pricing
            </span>
            <span>
              <CheckCircle2 /> Order tracking included
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
