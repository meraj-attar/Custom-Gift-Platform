import { Heart, Sparkles } from 'lucide-react'
import EmptyState from '../components/EmptyState'
import ProductCard from '../components/ProductCard'
import { useWishlist } from '../context/WishlistContext'

export default function Wishlist() {
  const { items, loading } = useWishlist()

  if (loading) return <div className="page-loader"><span className="spinner" /></div>

  return <div className="page-section wishlist-page">
    <div className="container">
      <div className="page-hero compact wishlist-hero">
        <span className="eyebrow"><Heart size={14} fill="currentColor" /> Saved gifts</span>
        <h1>Your wishlist</h1>
        <p>Keep meaningful ideas in one place, then personalize them when the moment feels right.</p>
        {items.length > 0 && <div className="wishlist-summary"><Sparkles size={17} /><strong>{items.length}</strong> {items.length === 1 ? 'gift' : 'gifts'} saved to your account</div>}
      </div>

      {items.length > 0
        ? <div className="product-grid">{items.map((product) => <ProductCard key={product.id} product={product} />)}</div>
        : <EmptyState title="Your wishlist is waiting" text="Tap the heart on any gift to save it here. Your picks will stay synced with your account." action="Explore gifts" to="/shop" />}
    </div>
  </div>
}
