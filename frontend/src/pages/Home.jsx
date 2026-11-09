import { ArrowRight, BadgeCheck, Eye, Gift, HeartHandshake, PackageCheck, Palette, Sparkles, Star, WandSparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ProductCard from '../components/ProductCard'
import api from '../services/api'

export default function Home() {
  const [products, setProducts] = useState([])
  useEffect(() => { api.get('/products?featured=true&page_size=4').then(({ data }) => setProducts(data.items)).catch(() => {}) }, [])

  return <>
    <section className="hero-section">
      <div className="hero-orb hero-orb-one" /><div className="hero-orb hero-orb-two" />
      <div className="container hero-grid">
        <div className="hero-copy">
          <span className="eyebrow"><Sparkles size={15} /> Gifts made personal</span>
          <h1>Turn beautiful moments into <span>meaningful gifts.</span></h1>
          <p>Upload a photo, add your words, choose the date that matters — we turn your story into a gift worth keeping.</p>
          <div className="hero-actions"><Link className="button button-lg" to="/shop">Explore gifts <ArrowRight size={18} /></Link><Link className="button button-outline button-lg" to="/studio"><Eye size={18} /> Try live preview</Link></div>
          <div className="trust-row"><span><BadgeCheck /> Secure checkout</span><span><PackageCheck /> Thoughtful packaging</span><span><HeartHandshake /> Made with care</span></div>
        </div>
        <div className="hero-visual">
          <div className="hero-card hero-card-main"><img src="/products/frame.jpg" alt="Personalized photo frame" /><div><span>Most loved</span><strong>Couple Memory Frame</strong><small>Made from your favorite moment</small></div></div>
          <div className="hero-card floating-card one"><WandSparkles /><span><strong>Personalize it</strong><small>Photo · text · date</small></span></div>
          <div className="hero-card floating-card two"><Star fill="currentColor" /><span><strong>4.8/5</strong><small>Customer rating</small></span></div>
        </div>
      </div>
    </section>

    <section className="section category-strip"><div className="container category-cards">
      {[['Mugs','/products/cup.jpg'],['Frames','/products/frame.jpg'],['Hampers','/products/hamper.jpg'],['Decor','/products/w1.jpg']].map(([name,img]) => <Link to={`/shop?category=${name}`} className="category-card" key={name}><img src={img} alt="" /><span>{name}<ArrowRight size={16} /></span></Link>)}
    </div></section>

    <section className="section"><div className="container">
      <div className="section-heading"><div><span className="eyebrow">Handpicked for you</span><h2>Gifts people remember</h2></div><Link className="text-link" to="/shop">View all <ArrowRight size={16} /></Link></div>
      <div className="product-grid">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div>
    </div></section>

    <section className="section how-section"><div className="container">
      <div className="section-heading centered"><div><span className="eyebrow">Simple by design</span><h2>Your gift, personalized in three steps</h2></div></div>
      <div className="steps-grid">
        <div className="step-card"><span>01</span><Gift /><h3>Choose a gift</h3><p>Pick from thoughtful products made for birthdays, anniversaries and everyday surprises.</p></div>
        <div className="step-card"><span>02</span><Palette /><h3>Make it yours</h3><p>Add your photo, message, names or a meaningful date with product-specific options.</p></div>
        <div className="step-card"><span>03</span><PackageCheck /><h3>We craft & deliver</h3><p>Track your order from confirmation through customization, shipping and delivery.</p></div>
      </div>
    </div></section>

    <section className="section"><div className="container story-banner"><div><span className="eyebrow light"><HeartHandshake size={15} /> More than a product</span><h2>Some gifts are opened once. The right ones are remembered for years.</h2><p>CustomGift helps you turn ordinary products into personal stories.</p><Link className="button button-light" to="/shop">Create something meaningful</Link></div><img src="/products/v5.jpg" alt="Personalized gift" /></div></section>
  </>
}
