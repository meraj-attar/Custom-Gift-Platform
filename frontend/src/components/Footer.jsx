import { Gift, Instagram, Linkedin, Mail, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Footer() {
  const { user, openSignOutModal } = useAuth()

  const handleFooterSignOut = (e) => {
    openSignOutModal(e.currentTarget)
  }

  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <Link className="brand footer-brand" to="/" style={{ color: '#fff', textDecoration: 'none' }}>
            <span className="brand-mark"><Gift size={20} /></span>
            <span><strong>Custom</strong>Gift</span>
          </Link>
          <p>Thoughtful personalized gifts handcrafted with love and delivered across India with care.</p>
          <div className="social-row">
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="CustomGift on Instagram"
            >
              <Instagram />
            </a>
            <a
              href="https://linkedin.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="CustomGift on LinkedIn"
            >
              <Linkedin />
            </a>
            <a
              href="mailto:support@customgift.dev"
              aria-label="Email CustomGift customer support"
            >
              <Mail />
            </a>
          </div>
        </div>
        <div>
          <h4>Explore</h4>
          <Link to="/shop">Shop gifts</Link>
          <a href="https://wa.me/918485089678" target="_blank" rel="noopener noreferrer">WhatsApp Customization</a>
          <Link to="/about">Our story</Link>
          <Link to="/contact">Contact us</Link>
        </div>
        <div>
          <h4>Account</h4>
          {user ? (
            <>
              <Link to="/orders">My orders</Link>
              <Link to="/wishlist">My wishlist</Link>
              <Link to="/cart">Gift bag</Link>
              <button
                type="button"
                className="footer-link-button"
                onClick={handleFooterSignOut}
                aria-haspopup="dialog"
                aria-label="Sign out of your account"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link to="/login">Sign in</Link>
              <Link to="/register">Create an account</Link>
              <Link to="/cart">Gift bag</Link>
            </>
          )}
        </div>
        <div className="footer-note">
          <Sparkles size={20} />
          <p>Every keepsake is handcrafted and inspected before dispatch to ensure lasting quality.</p>
        </div>
      </div>
      <div className="container footer-bottom">
        © {new Date().getFullYear()} CustomGift. Crafted with care.
      </div>
    </footer>
  )
}
