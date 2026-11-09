import { ArrowUpRight, Heart, Sparkles, Star } from 'lucide-react'
import toast from 'react-hot-toast'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useWishlist } from '../context/WishlistContext'
import { getErrorMessage, resolveImageUrl } from '../services/api'

export default function ProductCard({ product }) {
  const { user } = useAuth()
  const { toggle, isWishlisted, isPending } = useWishlist()
  const navigate = useNavigate()
  const location = useLocation()
  const saved = isWishlisted(product.id)
  const pending = isPending(product.id)

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

  return <article className="product-card">
    <div className="product-image-wrap">
      <Link to={`/products/${product.slug}`} className="product-image-link">
        <img src={resolveImageUrl(product.image_url)} alt={product.title} className="product-image" />
        {product.discount_percent > 0 && <span className="discount-pill">-{product.discount_percent}%</span>}
        {product.customizable && <span className="custom-pill"><Sparkles size={13} /> Personalizable</span>}
      </Link>
      <button
        type="button"
        className={`heart-button ${saved ? 'active' : ''}`}
        aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'}
        aria-pressed={saved}
        disabled={pending}
        onClick={onWishlist}
      >
        <Heart size={18} fill={saved ? 'currentColor' : 'none'} />
      </button>
    </div>
    <div className="product-card-body">
      <div className="product-meta"><span>{product.category}</span><span className="rating"><Star size={14} fill="currentColor" /> {product.rating}</span></div>
      <Link to={`/products/${product.slug}`}><h3>{product.title}</h3></Link>
      <div className="product-card-footer"><strong>₹{Number(product.price).toLocaleString('en-IN')}</strong><Link className="round-link" to={`/products/${product.slug}`}><ArrowUpRight size={18} /></Link></div>
    </div>
  </article>
}
