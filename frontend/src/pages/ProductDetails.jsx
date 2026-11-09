import { CalendarDays, CheckCircle2, Eye, Heart, ImagePlus, Minus, Plus, ShieldCheck, ShoppingBag, Sparkles, Star, Truck, Type } from 'lucide-react'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Link, useNavigate, useParams } from 'react-router-dom'
import api, { getErrorMessage, resolveImageUrl } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { useWishlist } from '../context/WishlistContext'

export default function ProductDetails() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { addItem } = useCart()
  const { toggle: toggleWishlist, isWishlisted, isPending } = useWishlist()
  const [product, setProduct] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [form, setForm] = useState({ occasion: '', custom_text: '', event_date: '', custom_image_url: '' })
  const [preview, setPreview] = useState('')
  const [uploading, setUploading] = useState(false)

  useEffect(() => { api.get(`/products/${slug}`).then(({ data }) => setProduct(data)).catch(() => navigate('/shop')) }, [slug, navigate])

  const onImage = async (file) => {
    if (!file) return
    if (!user) { toast.error('Sign in before uploading a personal photo'); navigate('/login'); return }
    setPreview(URL.createObjectURL(file)); setUploading(true)
    try {
      const data = new FormData(); data.append('file', file)
      const response = await api.post('/orders/customization-upload', data)
      setForm((current) => ({ ...current, custom_image_url: response.data.url }))
      toast.success('Photo uploaded securely')
    } catch (error) { toast.error(getErrorMessage(error)); setPreview('') } finally { setUploading(false) }
  }

  const add = () => {
    if (product.needs_image && !form.custom_image_url) return toast.error('Please upload a photo for this gift')
    if (product.needs_text && !form.custom_text.trim()) return toast.error('Please add your personalized message')
    if (product.needs_date && !form.event_date) return toast.error('Please select the special date')
    addItem({ product, quantity, customization: form })
    toast.success('Added to your gift bag')
    navigate('/cart')
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

  if (!product) return <div className="page-loader"><span className="spinner" /></div>

  return <div className="page-section"><div className="container product-detail-grid">
    <div className="detail-image-panel"><div className="detail-image"><img src={resolveImageUrl(product.image_url)} alt={product.title} /><span className="custom-pill"><Sparkles size={13} /> {product.customizable ? 'Personalizable' : 'Ready to gift'}</span></div><div className="detail-trust"><span><ShieldCheck /> Secure personalization</span><span><Truck /> {product.delivery_time}</span></div></div>
    <div className="detail-content">
      <Link className="breadcrumb" to="/shop">Shop / {product.category}</Link>
      <div className="detail-rating"><Star size={16} fill="currentColor" /> {product.rating} <span>• Loved by gift-givers</span></div>
      <h1>{product.title}</h1>
      <div className="detail-price">₹{Number(product.price).toLocaleString('en-IN')} {product.discount_percent > 0 && <span>{product.discount_percent}% off</span>}</div>
      <p className="detail-description">{product.description}</p>
      <div className="detail-facts"><span><strong>Material</strong>{product.material || 'Premium finish'}</span><span><strong>Stock</strong>{product.stock > 0 ? `${product.stock} available` : 'Sold out'}</span></div>

      {product.customizable && <div className="personalization-box"><div className="personalization-title"><div><span className="eyebrow"><Sparkles size={14} /> Personalize your gift</span><h3>Make this one unmistakably theirs</h3></div><Link className="preview-studio-link" to={`/studio?product=${product.slug}`}><Eye size={16} /> Open live preview</Link></div>
        <label>Occasion <select value={form.occasion} onChange={(e) => setForm({ ...form, occasion: e.target.value })}><option value="">Choose an occasion</option><option>Birthday</option><option>Anniversary</option><option>Wedding</option><option>Friendship</option><option>Thank You</option><option>Just Because</option></select></label>
        {product.needs_image && <label className="upload-zone"><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => onImage(e.target.files?.[0])} /><ImagePlus />{preview ? <><img src={preview} alt="Preview" /><span>{uploading ? 'Uploading...' : 'Photo ready ✓'}</span></> : <><strong>Upload your favorite photo</strong><small>JPG, PNG or WEBP · max 5 MB</small></>}</label>}
        {product.needs_text && <label><span><Type size={16} /> Personalized message</span><textarea maxLength={product.max_text_length} value={form.custom_text} onChange={(e) => setForm({ ...form, custom_text: e.target.value })} placeholder="Write something meaningful..." /><small className="char-count">{form.custom_text.length}/{product.max_text_length}</small></label>}
        {product.needs_date && <label><span><CalendarDays size={16} /> Special date</span><input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} /></label>}
      </div>}

      <div className="buy-row"><div className="quantity-control"><button onClick={() => setQuantity(Math.max(1, quantity - 1))}><Minus size={16} /></button><span>{quantity}</span><button onClick={() => setQuantity(Math.min(Math.min(10, product.stock), quantity + 1))}><Plus size={16} /></button></div><button className="button button-lg grow" disabled={product.stock < 1 || uploading} onClick={add}><ShoppingBag size={18} /> {product.stock < 1 ? 'Out of stock' : 'Add to gift bag'}</button><button className={`detail-wishlist-button ${isWishlisted(product.id) ? 'active' : ''}`} disabled={isPending(product.id)} onClick={saveGift} aria-label={isWishlisted(product.id) ? 'Remove from wishlist' : 'Save to wishlist'}><Heart size={20} fill={isWishlisted(product.id) ? 'currentColor' : 'none'} /></button></div>
      <div className="mini-assurances"><span><CheckCircle2 /> Server-calculated secure pricing</span><span><CheckCircle2 /> Order tracking included</span></div>
    </div>
  </div></div>
}
