import { ArrowLeft, CheckCircle2, ImagePlus, Minus, Plus, ShoppingBag, Sparkles, WandSparkles } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import GiftPreview from '../components/GiftPreview'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import api, { getErrorMessage } from '../services/api'

const EMPTY_FORM = { occasion: '', custom_text: '', event_date: '', custom_image_url: '' }

export default function CustomizationStudio() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { addItem } = useCart()
  const [products, setProducts] = useState([])
  const [selectedSlug, setSelectedSlug] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)
  const [previewImage, setPreviewImage] = useState('')
  const [previewFile, setPreviewFile] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const requestedSlug = useMemo(() => new URLSearchParams(location.search).get('product') || '', [location.search])
  const product = products.find((item) => item.slug === selectedSlug) || null

  useEffect(() => {
    let active = true
    api.get('/products?page_size=50')
      .then(({ data }) => {
        if (!active) return
        const customizable = data.items.filter((item) => item.customizable)
        setProducts(customizable)
        const requested = customizable.find((item) => item.slug === requestedSlug)
        setSelectedSlug(requested?.slug || customizable[0]?.slug || '')
      })
      .catch((error) => toast.error(getErrorMessage(error)))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [requestedSlug])

  useEffect(() => {
    setForm(EMPTY_FORM)
    setPreviewImage((current) => {
      if (current?.startsWith('blob:')) URL.revokeObjectURL(current)
      return ''
    })
    setPreviewFile(null)
    setQuantity(1)
  }, [selectedSlug])

  useEffect(() => () => {
    if (previewImage?.startsWith('blob:')) URL.revokeObjectURL(previewImage)
  }, [previewImage])

  const chooseImage = (file) => {
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return toast.error('Use JPG, PNG or WEBP')
    if (file.size > 5 * 1024 * 1024) return toast.error('Image must be 5 MB or smaller')
    if (previewImage?.startsWith('blob:')) URL.revokeObjectURL(previewImage)
    setPreviewFile(file)
    setPreviewImage(URL.createObjectURL(file))
  }

  const validate = () => {
    if (!product) return false
    if (product.needs_image && !previewFile) { toast.error('Add a photo to preview this gift'); return false }
    if (product.needs_text && !form.custom_text.trim()) { toast.error('Add your personalized message'); return false }
    if (product.needs_date && !form.event_date) { toast.error('Choose the special date'); return false }
    return true
  }

  const addToBag = async () => {
    if (!validate()) return
    if (!user) {
      toast.error('Sign in to securely save your customization')
      navigate('/login', { state: { from: `/studio?product=${product.slug}` } })
      return
    }
    setSaving(true)
    try {
      let customImageUrl = ''
      if (previewFile) {
        const data = new FormData()
        data.append('file', previewFile)
        const response = await api.post('/orders/customization-upload', data)
        customImageUrl = response.data.url
      }
      addItem({ product, quantity, customization: { ...form, custom_image_url: customImageUrl } })
      toast.success('Your personalized gift was added to the bag')
      navigate('/cart')
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="page-loader"><span className="spinner" /></div>
  if (!products.length) return <div className="page-section"><div className="container studio-empty"><h1>No customizable products are available yet.</h1><Link className="button" to="/shop">Back to shop</Link></div></div>

  return <div className="page-section studio-page">
    <div className="container">
      <div className="studio-hero">
        <div><span className="eyebrow"><WandSparkles size={15} /> Customization Studio</span><h1>See your gift before you order it.</h1><p>Choose a customizable product, add your photo, message and date, and preview the result live before saving it to your gift bag.</p></div>
        <Link className="text-link" to="/shop"><ArrowLeft size={16} /> Browse all gifts</Link>
      </div>

      <div className="studio-layout">
        <section className="studio-controls">
          <div className="studio-card">
            <div className="studio-step"><span>01</span><div><strong>Choose your gift</strong><small>Only products that support personalization are shown.</small></div></div>
            <label>Product
              <select value={selectedSlug} onChange={(e) => setSelectedSlug(e.target.value)}>
                {products.map((item) => <option value={item.slug} key={item.id}>{item.title} · ₹{Number(item.price).toLocaleString('en-IN')}</option>)}
              </select>
            </label>
          </div>

          <div className="studio-card">
            <div className="studio-step"><span>02</span><div><strong>Personalize it</strong><small>The preview updates while you type.</small></div></div>
            <label>Occasion
              <select value={form.occasion} onChange={(e) => setForm({ ...form, occasion: e.target.value })}>
                <option value="">Choose an occasion</option><option>Birthday</option><option>Anniversary</option><option>Wedding</option><option>Friendship</option><option>Thank You</option><option>Congratulations</option><option>Just Because</option>
              </select>
            </label>
            {product?.needs_image && <label className={`studio-upload ${previewImage ? 'has-image' : ''}`}>
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => chooseImage(e.target.files?.[0])} />
              <ImagePlus />
              <span><strong>{previewImage ? 'Change your photo' : 'Upload a photo'}</strong><small>JPG, PNG or WEBP · up to 5 MB</small></span>
            </label>}
            {product?.needs_text && <label>Personalized message
              <textarea maxLength={product.max_text_length} rows="4" value={form.custom_text} onChange={(e) => setForm({ ...form, custom_text: e.target.value })} placeholder="Write something meaningful..." />
              <small className="char-count">{form.custom_text.length}/{product.max_text_length}</small>
            </label>}
            {product?.needs_date && <label>Special date<input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} /></label>}
          </div>

          <div className="studio-card studio-order-card">
            <div className="studio-step"><span>03</span><div><strong>Save your design</strong><small>Your uploaded image is stored securely only when you add the gift to your bag.</small></div></div>
            <div className="studio-price-row"><div><small>{product.category}</small><strong>{product.title}</strong></div><b>₹{Number(product.price).toLocaleString('en-IN')}</b></div>
            <div className="studio-buy-row">
              <div className="quantity-control"><button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))}><Minus size={16} /></button><span>{quantity}</span><button type="button" onClick={() => setQuantity(Math.min(Math.min(10, product.stock), quantity + 1))}><Plus size={16} /></button></div>
              <button className="button button-lg grow" disabled={saving || product.stock < 1} onClick={addToBag}><ShoppingBag size={18} /> {saving ? 'Saving design...' : product.stock < 1 ? 'Out of stock' : 'Add previewed gift to bag'}</button>
            </div>
            <div className="studio-assurances"><span><CheckCircle2 /> Live customer preview</span><span><CheckCircle2 /> Secure image upload</span><span><CheckCircle2 /> Server-validated order</span></div>
          </div>
        </section>

        <aside className="studio-preview-panel">
          <div className="studio-preview-head"><div><span className="eyebrow"><Sparkles size={14} /> Live preview</span><h2>{product.title}</h2></div><span className="studio-live-dot">Live</span></div>
          <GiftPreview product={product} previewImage={previewImage} customization={form} />
          <div className="studio-preview-summary">
            <span><small>Occasion</small><strong>{form.occasion || 'Not selected'}</strong></span>
            {product.needs_text && <span><small>Message</small><strong>{form.custom_text || 'Not added yet'}</strong></span>}
            {product.needs_date && <span><small>Date</small><strong>{form.event_date || 'Not selected'}</strong></span>}
            {product.needs_image && <span><small>Photo</small><strong>{previewImage ? 'Ready for preview' : 'Not uploaded yet'}</strong></span>}
          </div>
        </aside>
      </div>
    </div>
  </div>
}
