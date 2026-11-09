import { CalendarDays, Image as ImageIcon, Sparkles } from 'lucide-react'
import { resolveImageUrl } from '../services/api'

const categoryClass = (category = '') => {
  const value = category.toLowerCase()
  if (value.includes('mug')) return 'mug'
  if (value.includes('frame')) return 'frame'
  if (value.includes('hamper')) return 'hamper'
  if (value.includes('photo')) return 'photo'
  if (value.includes('decor') || value.includes('plaque')) return 'decor'
  return 'keepsake'
}

export default function GiftPreview({ product, previewImage, customization }) {
  if (!product) return null
  const type = categoryClass(product.category)
  const text = customization.custom_text?.trim()
  const date = customization.event_date
  const occasion = customization.occasion

  return <div className={`gift-preview gift-preview-${type}`}>
    <div className="gift-preview-stage">
      <img className="gift-preview-product" src={resolveImageUrl(product.image_url)} alt={product.title} />
      {product.needs_image && <div className="gift-preview-photo-slot">
        {previewImage
          ? <img src={previewImage} alt="Your uploaded customization preview" />
          : <div className="gift-preview-photo-empty"><ImageIcon /><span>Your photo</span></div>}
      </div>}
      {(product.needs_text || product.needs_date || occasion) && <div className="gift-preview-copy">
        {occasion && <small>{occasion}</small>}
        {product.needs_text && <strong>{text || 'Your message appears here'}</strong>}
        {product.needs_date && <span><CalendarDays size={13} /> {date || 'Special date'}</span>}
      </div>}
      <span className="gift-preview-badge"><Sparkles size={13} /> Live mockup</span>
    </div>
    <div className="gift-preview-note">Preview is a visual mockup. Final crop, print position and colors may vary slightly during production.</div>
  </div>
}
