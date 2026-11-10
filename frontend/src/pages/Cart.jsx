import { ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import EmptyState from '../components/EmptyState'
import { useCart } from '../context/CartContext'
import { resolveImageUrl } from '../services/api'

export default function Cart() {
  const { items, total, updateQuantity, removeItem } = useCart()
  if (!items.length) return <div className="page-section"><div className="container"><EmptyState title="Your gift bag is empty" text="Find something meaningful and make it personal." /></div></div>

  return <div className="page-section"><div className="container">
    <div className="page-hero compact align-left"><span className="eyebrow">Your selection</span><h1>Gift bag</h1><p>Review your personalized gifts before checkout.</p></div>
    <div className="cart-layout">
      <div className="cart-items">
        {items.map((item) => <article className="cart-item" key={item.cartId}>
          <img src={resolveImageUrl(item.product.image_url)} alt={item.product.title} />
          <div className="cart-item-main"><div><span className="cart-category">{item.product.category}</span><h3>{item.product.title}</h3></div>
            {(item.customization?.custom_text || item.customization?.event_date || item.customization?.occasion || item.customization?.custom_image_url) && <div className="custom-summary">{item.customization?.occasion && <span>Occasion: {item.customization.occasion}</span>}{item.customization?.custom_text && <span>Message: “{item.customization.custom_text}”</span>}{item.customization?.event_date && <span>Date: {item.customization.event_date}</span>}{item.customization?.custom_image_url && <span>Photo uploaded securely ✓</span>}</div>}
            <div className="cart-item-actions"><div className="quantity-control small"><button onClick={() => updateQuantity(item.cartId, item.quantity - 1)}><Minus size={14} /></button><span>{item.quantity}</span><button onClick={() => updateQuantity(item.cartId, item.quantity + 1)}><Plus size={14} /></button></div><button className="danger-text" onClick={() => removeItem(item.cartId)}><Trash2 size={16} /> Remove</button></div>
          </div>
          <strong className="cart-price">₹{(Number(item.product.price) * item.quantity).toLocaleString('en-IN')}</strong>
        </article>)}
      </div>
      <aside className="order-summary"><ShoppingBag /><h3>Order summary</h3><div><span>Subtotal</span><strong>₹{total.toLocaleString('en-IN')}</strong></div><div><span>Shipping</span><strong>Free</strong></div><div className="summary-total"><span>Total</span><strong>₹{total.toLocaleString('en-IN')}</strong></div><p>Taxes, if applicable, are included in the displayed total.</p><Link className="button button-lg full" to="/checkout">Continue to checkout <ArrowRight size={17} /></Link><Link className="text-link center" to="/shop">Continue shopping</Link></aside>
    </div>
  </div></div>
}
