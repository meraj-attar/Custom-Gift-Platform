import {
  ArrowRight,
  Award,
  CheckCircle2,
  Clock,
  Gift,
  Heart,
  MessageSquare,
  PackageCheck,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  WandSparkles,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ProductCard from '../components/ProductCard'
import api, { getErrorMessage } from '../services/api'

export default function About() {
  const [featuredProducts, setFeaturedProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Scroll to top and set page title on mount
  useEffect(() => {
    document.title = 'About Us — CustomGift | Meaningful Personalized Gifts'
    window.scrollTo(0, 0)
  }, [])

  // Load real catalog items for the collection showcase
  const loadFeaturedProducts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Fetch 4 top products from real backend
      const res = await api.get('/products?page_size=4&sort_by=rating')
      if (res.data?.items && res.data.items.length > 0) {
        setFeaturedProducts(res.data.items.slice(0, 4))
      } else {
        const fallbackRes = await api.get('/products?page_size=4')
        setFeaturedProducts(fallbackRes.data?.items?.slice(0, 4) || [])
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
    <div className="about-page" data-testid="about-page">
      {/* =========================================================================
          SECTION 1: HERO — OUR STORY
          ========================================================================= */}
      <section className="about-hero-section" aria-labelledby="about-hero-title">
        <div className="container">
          <div className="about-hero-grid">
            <div className="about-hero-copy">
              <span className="eyebrow">
                <Sparkles size={14} /> Our Story
              </span>
              <h1 id="about-hero-title">
                Technology for gifts that still feel deeply human.
              </h1>
              <p className="about-hero-lead">
                CustomGift makes meaningful gifting simple. Discover thoughtfully selected gifts,
                personalize them with your memories and messages, and create something worth remembering.
              </p>
              <div className="about-hero-actions">
                <Link className="button button-lg" to="/shop" aria-label="Explore our gift collection">
                  Explore the Collection <ArrowRight size={18} />
                </Link>
                <Link
                  className="button button-lg button-outline"
                  to="/contact"
                  aria-label="Contact CustomGift support team"
                >
                  <MessageSquare size={17} /> Contact Us
                </Link>
              </div>
            </div>

            <div className="about-hero-media" aria-label="Personalized keepsake showcase gallery">
              <div className="about-collage-stage">
                <div className="about-collage-item item-main">
                  <img
                    src="/products/frame.jpg"
                    alt="Handcrafted personalized photo frame with memory moments"
                    loading="eager"
                  />
                  <div className="collage-floating-pill">
                    <Heart size={14} fill="currentColor" /> Handcrafted Keepsake
                  </div>
                </div>
                <div className="about-collage-item item-sub-top">
                  <img
                    src="/products/hamper.jpg"
                    alt="Curated celebration gift hamper box"
                    loading="eager"
                  />
                </div>
                <div className="about-collage-item item-sub-bottom">
                  <img
                    src="/products/cup.jpg"
                    alt="Personalized ceramic memory photo mug"
                    loading="eager"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 2: OUR MISSION (SPLIT LAYOUT)
          ========================================================================= */}
      <section className="about-mission-section" aria-labelledby="mission-title">
        <div className="container">
          <div className="about-mission-grid">
            <div className="mission-copy">
              <span className="eyebrow">
                <Heart size={14} /> Our Mission
              </span>
              <h2 id="mission-title">
                Turning everyday moments into keepsakes you can hold.
              </h2>
              <p>
                Gifting should never feel like an impersonal transaction. When you choose a gift
                personalized with an intimate photo, an anniversary date, or a heartfelt note, you aren’t
                just sending an object—you’re celebrating a shared journey.
              </p>
              <p>
                We built CustomGift to bridge thoughtful software and genuine craftsmanship. Our
                platform lets you personalize gifts with real-time previews, while every finished
                piece is crafted to ensure your memories arrive intact and ready to cherish.
              </p>
              <div className="mission-checklist">
                <div className="mission-check-item">
                  <CheckCircle2 size={18} className="check-icon" />
                  <div>
                    <strong>Meaningful Over Generic</strong>
                    <p>Every product is designed around authentic personalization, not mass production.</p>
                  </div>
                </div>
                <div className="mission-check-item">
                  <CheckCircle2 size={18} className="check-icon" />
                  <div>
                    <strong>Crafted for Durability</strong>
                    <p>Archival paper, glossy ceramic glazes, and polished acrylics built to last.</p>
                  </div>
                </div>
                <div className="mission-check-item">
                  <CheckCircle2 size={18} className="check-icon" />
                  <div>
                    <strong>Transparent Experience</strong>
                    <p>Clear pricing, verified inventory, and honest timelines with zero hidden fees.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mission-media">
              <div className="mission-card-preview">
                <img
                  src="/products/w1.jpg"
                  alt="Personalized family name wooden wall plaque on display"
                  loading="lazy"
                />
                <div className="mission-quote-overlay">
                  <p>
                    “A gift made with care doesn’t end up forgotten in a drawer—it lives proudly on a
                    nightstand, desk, or mantle for years to come.”
                  </p>
                  <span className="quote-author">— The CustomGift Philosophy</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 3: WHAT MAKES CUSTOMGIFT DIFFERENT (FEATURE CARDS)
          ========================================================================= */}
      <section className="about-features-section" aria-labelledby="features-title">
        <div className="container">
          <div className="section-header text-center">
            <span className="eyebrow">
              <WandSparkles size={14} /> Why CustomGift
            </span>
            <h2 id="features-title">Crafted with heart, powered by modern care.</h2>
            <p className="section-subtitle">
              We combine intuitive personalization tools with dedicated artisan finishing so every gift
              feels truly one of a kind.
            </p>
          </div>

          <div className="about-features-grid">
            <article className="about-feature-card">
              <div className="feature-icon-box">
                <Sparkles size={24} />
              </div>
              <h3>Personalized Experiences</h3>
              <p>
                Gifts that customers can tailor with photos, names, heartfelt messages, and special dates,
                adapting cleanly to each product’s unique capabilities.
              </p>
            </article>

            <article className="about-feature-card">
              <div className="feature-icon-box">
                <ShoppingBag size={24} />
              </div>
              <h3>Simple Shopping Experience</h3>
              <p>
                Browse products, add them directly to your gift bag, personalize at your own pace, and
                complete checkout through a transparent customer journey.
              </p>
            </article>

            <article className="about-feature-card">
              <div className="feature-icon-box">
                <ShieldCheck size={24} />
              </div>
              <h3>Secure Shopping</h3>
              <p>
                Protected session management, authenticated order ownership, secure file upload validation,
                and transactional stock concurrency protect your privacy.
              </p>
            </article>

            <article className="about-feature-card">
              <div className="feature-icon-box">
                <Gift size={24} />
              </div>
              <h3>Thoughtful Gift Collection</h3>
              <p>
                Explore meaningful gifts across ceramic mugs, timber frames, ambient lamps, and celebration
                hampers curated for birthdays, weddings, and anniversaries.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 4: HOW CUSTOMGIFT WORKS (4-STEP WORKFLOW)
          ========================================================================= */}
      <section className="about-workflow-section" aria-labelledby="workflow-title">
        <div className="container">
          <div className="section-header text-center">
            <span className="eyebrow">
              <Clock size={14} /> The Experience
            </span>
            <h2 id="workflow-title">From your imagination to their doorstep.</h2>
            <p className="section-subtitle">
              Four simple steps to turn your cherished memories into an unforgettable gift.
            </p>
          </div>

          <div className="workflow-steps-grid">
            <div className="workflow-step-card">
              <div className="step-number-badge">01</div>
              <div className="step-content">
                <h3>Explore</h3>
                <p>
                  Discover handpicked gifts across curated categories including mugs, memory frames,
                  illuminated decor, and gift hampers.
                </p>
              </div>
            </div>

            <div className="workflow-step-card">
              <div className="step-number-badge">02</div>
              <div className="step-content">
                <h3>Choose</h3>
                <p>
                  Select the keepsake that fits your recipient and occasion, with transparent pricing and
                  real-time stock availability.
                </p>
              </div>
            </div>

            <div className="workflow-step-card">
              <div className="step-number-badge">03</div>
              <div className="step-content">
                <h3>Personalize</h3>
                <p>
                  Upload your favorite photos, inscribe names, and write heartfelt notes with instant live
                  visual feedback before purchasing.
                </p>
              </div>
            </div>

            <div className="workflow-step-card">
              <div className="step-number-badge">04</div>
              <div className="step-content">
                <h3>Order & Delight</h3>
                <p>
                  Review your customized items in the Gift Bag, complete secure checkout, and track your
                  order from crafting to dispatch.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 5: EXPLORE OUR COLLECTION (REAL CATALOG INTEGRATION)
          ========================================================================= */}
      <section className="about-collection-section" aria-labelledby="collection-title">
        <div className="container">
          <div className="section-header text-center">
            <span className="eyebrow">
              <Award size={14} /> Featured Keepsakes
            </span>
            <h2 id="collection-title">A glimpse into our crafted collection.</h2>
            <p className="section-subtitle">
              Explore authentic gifts personalized by real customers across India.
            </p>
          </div>

          {loading ? (
            <div className="product-grid" aria-label="Loading featured gifts">
              {[1, 2, 3, 4].map((id) => (
                <div key={id} className="product-card skeleton-card">
                  <div className="skeleton-image" />
                  <div className="skeleton-text" />
                  <div className="skeleton-text short" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="about-error-box" role="alert">
              <p>{error}</p>
              <button
                type="button"
                className="button button-sm button-outline"
                onClick={loadFeaturedProducts}
              >
                Retry Loading Gifts
              </button>
            </div>
          ) : (
            <div className="product-grid" data-testid="about-products-grid">
              {featuredProducts.map((item) => (
                <ProductCard product={item} key={item.id} />
              ))}
            </div>
          )}

          <div className="collection-cta-wrap">
            <Link className="button button-lg button-outline" to="/shop">
              View All Gifts <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 6: OUR COMMITMENT (TRUST & INTEGRITY)
          ========================================================================= */}
      <section className="about-commitment-section" aria-labelledby="commitment-title">
        <div className="container">
          <div className="section-header text-center">
            <span className="eyebrow">
              <PackageCheck size={14} /> Our Promise
            </span>
            <h2 id="commitment-title">The principles behind every gift we craft.</h2>
            <p className="section-subtitle">
              We hold ourselves to rigorous standards because gifts carry feelings that words alone cannot.
            </p>
          </div>

          <div className="commitment-grid">
            <div className="commitment-card">
              <div className="commitment-icon">
                <Award size={22} />
              </div>
              <h3>Quality-Focused Gifting</h3>
              <p>
                Materials selected for longevity—from archival photo paper to glossy ceramics and
                polished acrylics that stand the test of time.
              </p>
            </div>

            <div className="commitment-card">
              <div className="commitment-icon">
                <Sparkles size={22} />
              </div>
              <h3>Thoughtful Personalization</h3>
              <p>
                You preview your custom details before ordering, ensuring every letter and photo
                alignment matches your intention.
              </p>
            </div>

            <div className="commitment-card">
              <div className="commitment-icon">
                <CheckCircle2 size={22} />
              </div>
              <h3>Transparent Shopping Experience</h3>
              <p>
                Honest upfront pricing, clear stock status on every gift, and zero hidden markups or
                surprise fees at checkout.
              </p>
            </div>

            <div className="commitment-card">
              <div className="commitment-icon">
                <PackageCheck size={22} />
              </div>
              <h3>Reliable Order Communication</h3>
              <p>
                Clear status updates from placement through crafting and dispatch, so you always know
                where your gift is on its journey.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 7: FINAL CTA
          ========================================================================= */}
      <section className="about-final-cta-section" aria-labelledby="cta-heading">
        <div className="container">
          <div className="about-cta-banner">
            <div className="cta-content">
              <span className="eyebrow">
                <Sparkles size={14} /> Start Personalizing Today
              </span>
              <h2 id="cta-heading">Make Every Gift More Meaningful.</h2>
              <p>
                Find something special, add your personal touch, and create a memory worth sharing.
              </p>
              <div className="cta-action-row">
                <Link className="button button-lg" to="/shop" aria-label="Explore personalized gifts now">
                  Explore Gifts <ArrowRight size={18} />
                </Link>
                <Link
                  className="button button-lg button-outline"
                  to="/contact"
                  aria-label="Contact our team with questions"
                >
                  <MessageSquare size={17} /> Contact Us
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
