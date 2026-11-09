import { Gift, Instagram, Linkedin, Mail, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Footer() {
  return <footer className="site-footer">
    <div className="container footer-grid">
      <div>
        <div className="brand footer-brand"><span className="brand-mark"><Gift size={20} /></span><span><strong>Custom</strong>Gift</span></div>
        <p>Thoughtful personalized gifts for the people and moments that matter.</p>
        <div className="social-row"><a href="#" aria-label="Instagram"><Instagram /></a><a href="#" aria-label="LinkedIn"><Linkedin /></a><a href="mailto:hello@customgift.dev" aria-label="Email"><Mail /></a></div>
      </div>
      <div><h4>Explore</h4><Link to="/shop">Shop gifts</Link><Link to="/about">Our story</Link><Link to="/contact">Contact</Link></div>
      <div><h4>Account</h4><Link to="/orders">My orders</Link><Link to="/cart">Cart</Link><Link to="/login">Sign in</Link></div>
      <div className="footer-note"><Sparkles size={20} /><p>Made as a modern full-stack portfolio project with React + FastAPI.</p></div>
    </div>
    <div className="container footer-bottom">© {new Date().getFullYear()} CustomGift. Crafted with care.</div>
  </footer>
}
