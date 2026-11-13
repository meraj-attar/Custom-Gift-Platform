import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  Gift,
  HeartHandshake,
  MessageCircle,
  PackageCheck,
  RefreshCw,
  Sparkles,
  Star,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ProductCard from '../components/ProductCard'
import WhatsAppIcon from '../components/WhatsAppIcon'
import api, { getErrorMessage } from '../services/api'

const CATEGORIES = [
  { name: 'Mugs', img: '/products/cup.jpg', desc: 'Personalized ceramic coffee & photo mugs' },
  { name: 'Frames', img: '/products/frame.jpg', desc: 'Custom wooden & acrylic memory frames' },
  { name: 'Hampers', img: '/products/hamper.jpg', desc: 'Curated celebration & festival gift hampers' },
  { name: 'Decor', img: '/products/w1.jpg', desc: 'Handcrafted personalized home decor & keepsakes' },
]

export default function Home() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadFeaturedProducts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // 1. Attempt fetching explicitly featured products
      const res = await api.get('/products?featured=true&page_size=4')
      if (res.data?.items && res.data.items.length > 0) {
        setProducts(res.data.items.slice(0, 4))
      } else {
        // Fallback: If no featured items are marked yet, fetch top catalog items
        const fallbackRes = await api.get('/products?page_size=4&sort_by=rating')
        setProducts(fallbackRes.data?.items?.slice(0, 4) || [])
      }
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadFeaturedProducts()
  }, [loadFeaturedProducts])

  return (
    <>
      {/* 1. Hero Section */}
      <section className="hero-section" aria-label="Welcome banner">
        <div className="hero-orb hero-orb-one" aria-hidden="true" />
        <div className="hero-orb hero-orb-two" aria-hidden="true" />
        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="eyebrow">
              <Sparkles size={15} /> Gifts made personal
            </span>
            <h1>
              Turn beautiful moments into <span>meaningful gifts.</span>
            </h1>
            <p>
              Upload a photo, add your words, choose the date that matters — we turn your story into
              a gift worth keeping.
            </p>
            <div className="hero-actions">
              <Link className="button button-lg" to="/shop">
                Explore gifts <ArrowRight size={18} />
              </Link>
              <a
                className="button button-outline button-lg hero-whatsapp-btn"
                href="https://wa.me/918485089678"
                target="_blank"
                rel="noopener noreferrer"
              >
                <WhatsAppIcon size={18} /> WhatsApp Customization
              </a>
            </div>
            <div className="trust-row">
              <span>
                <BadgeCheck /> Secure checkout
              </span>
              <span>
                <PackageCheck /> Thoughtful packaging
              </span>
              <span>
                <HeartHandshake /> Made with care
              </span>
            </div>
          </div>
          <div className="hero-visual">
            <Link
              to="/shop?category=Frames"
              className="hero-card hero-card-main hero-interactive-card"
              aria-label="Explore Couple Memory Frame collection"
            >
              <img src="/products/frame.jpg" alt="Personalized couple memory photo frame" />
              <div>
                <span>Most loved</span>
                <strong>Couple Memory Frame</strong>
                <small>Made from your favorite moment</small>
              </div>
            </Link>
            <a
              href="https://wa.me/918485089678"
              target="_blank"
              rel="noopener noreferrer"
              className="hero-card floating-card one hero-interactive-floating"
              aria-label="Connect on WhatsApp for Customization"
            >
              <WhatsAppIcon size={22} />
              <span>
                <strong>Customize on WhatsApp</strong>
                <small>Photo · text · date</small>
              </span>
            </a>
            <div className="hero-card floating-card two" aria-label="Customer rating 4.8 out of 5 stars">
              <Star fill="currentColor" />
              <span>
                <strong>4.8/5</strong>
                <small>Customer rating</small>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Gift Categories Strip */}
      <section className="section category-strip" aria-label="Popular categories">
        <div className="container category-cards">
          {CATEGORIES.map(({ name, img, desc }) => (
            <Link
              to={`/shop?category=${encodeURIComponent(name)}`}
              className="category-card"
              key={name}
              aria-label={`${name} - ${desc}`}
            >
              <img src={img} alt={`${name} gift collection`} loading="lazy" />
              <span>
                {name}
                <ArrowRight size={16} />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* 3. Featured & Recommended Products */}
      <section className="section" aria-label="Featured personalized gifts">
        <div className="container">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Handpicked for you</span>
              <h2>Gifts people remember</h2>
            </div>
            <Link className="text-link" to="/shop">
              View all <ArrowRight size={16} />
            </Link>
          </div>

          {loading ? (
            <div className="product-grid" data-testid="products-loading" aria-busy="true">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="product-card skeleton-card" aria-hidden="true">
                  <div className="skeleton-image-wrap shimmer" />
                  <div className="product-card-body">
                    <div className="skeleton-line shimmer short" />
                    <div className="skeleton-line shimmer title" />
                    <div className="skeleton-footer">
                      <div className="skeleton-line shimmer price" />
                      <div className="skeleton-circle shimmer" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="home-status-card error-card" role="alert">
              <AlertCircle className="status-icon" size={32} />
              <div>
                <h4>Unable to load featured gifts</h4>
                <p>{error}</p>
              </div>
              <button
                type="button"
                className="button button-sm"
                onClick={loadFeaturedProducts}
              >
                <RefreshCw size={14} /> Retry
              </button>
            </div>
          ) : products.length === 0 ? (
            <div className="home-status-card empty-card">
              <Gift className="status-icon" size={32} />
              <div>
                <h4>No featured gifts available right now</h4>
                <p>Browse our complete catalog to find your favorite personalized keepsakes.</p>
              </div>
              <Link to="/shop" className="button button-sm">
                Explore catalog <ArrowRight size={14} />
              </Link>
            </div>
          ) : (
            <div className="product-grid" data-testid="products-grid">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 4. How It Works (Three-Step Process) */}
      <section className="section how-section" aria-label="How CustomGift works">
        <div className="container">
          <div className="section-heading centered">
            <div>
              <span className="eyebrow">Simple by design</span>
              <h2>Your gift, personalized in three steps</h2>
            </div>
          </div>
          <div className="steps-grid">
            <Link to="/shop" className="step-card" aria-label="Step 1: Choose a gift - browse products">
              <div className="step-card-top">
                <div className="step-icon-wrap">
                  <Gift size={24} />
                </div>
                <span className="step-number-pill">01</span>
              </div>
              <div className="step-card-body">
                <h3>Choose a gift</h3>
                <p>Pick from thoughtful products made for birthdays, anniversaries and everyday surprises.</p>
              </div>
              <div className="step-card-footer">
                <span className="step-action">
                  Browse catalog <ArrowRight size={14} />
                </span>
              </div>
            </Link>

            <a
              href="https://wa.me/918485089678"
              target="_blank"
              rel="noopener noreferrer"
              className="step-card step-card-whatsapp"
              aria-label="Step 2: Customize via WhatsApp"
            >
              <div className="step-card-top">
                <div className="step-icon-wrap step-icon-whatsapp">
                  <WhatsAppIcon size={24} />
                </div>
                <span className="step-number-pill">02</span>
              </div>
              <div className="step-card-body">
                <h3>Customize via WhatsApp</h3>
                <p>Chat directly with our team on WhatsApp to personalize names, photos, and messages.</p>
              </div>
              <div className="step-card-footer">
                <span className="step-action step-action-whatsapp">
                  Chat on WhatsApp <ArrowRight size={14} />
                </span>
              </div>
            </a>

            <Link to="/orders" className="step-card" aria-label="Step 3: Track crafting and delivery">
              <div className="step-card-top">
                <div className="step-icon-wrap">
                  <PackageCheck size={24} />
                </div>
                <span className="step-number-pill">03</span>
              </div>
              <div className="step-card-body">
                <h3>We craft & deliver</h3>
                <p>Track your order from confirmation through shipping and doorstep delivery.</p>
              </div>
              <div className="step-card-footer">
                <span className="step-action">
                  Track orders <ArrowRight size={14} />
                </span>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* 5. Promotional Story Banner */}
      <section className="section" aria-label="Brand philosophy">
        <div className="container story-banner">
          <div>
            <span className="eyebrow light">
              <HeartHandshake size={15} /> More than a product
            </span>
            <h2>Some gifts are opened once. The right ones are remembered for years.</h2>
            <p>CustomGift helps you turn ordinary products into personal stories.</p>
            <Link className="button button-light" to="/shop">
              Explore Collection
            </Link>
          </div>
          <img
            src="/products/v5.jpg"
            alt="Handcrafted personalized gift collection with mug, cushion and chocolate box"
            loading="lazy"
          />
        </div>
      </section>
    </>
  )
}
