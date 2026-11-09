import { Gift, Heart, Menu, ShoppingBag, UserRound, X } from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { useWishlist } from '../context/WishlistContext'

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const { user, isAdmin, logout } = useAuth()
  const { count } = useCart()
  const { count: wishlistCount } = useWishlist()
  const linkClass = ({ isActive }) => `nav-link ${isActive ? 'active' : ''}`

  return <header className="site-header">
    <div className="container nav-shell">
      <Link className="brand" to="/" onClick={() => setOpen(false)}>
        <span className="brand-mark"><Gift size={22} /></span>
        <span><strong>Custom</strong>Gift</span>
      </Link>
      <button className="nav-toggle" onClick={() => setOpen(!open)} aria-label="Toggle navigation">{open ? <X /> : <Menu />}</button>
      <nav className={`main-nav ${open ? 'open' : ''}`}>
        <NavLink className={linkClass} to="/" onClick={() => setOpen(false)}>Home</NavLink>
        <NavLink className={linkClass} to="/shop" onClick={() => setOpen(false)}>Shop</NavLink>
        <NavLink className={linkClass} to="/studio" onClick={() => setOpen(false)}>Studio</NavLink>
        <NavLink className={linkClass} to="/about" onClick={() => setOpen(false)}>About</NavLink>
        <NavLink className={linkClass} to="/contact" onClick={() => setOpen(false)}>Contact</NavLink>
        {user && <NavLink className={linkClass} to="/orders" onClick={() => setOpen(false)}>My Orders</NavLink>}
        {isAdmin && <NavLink className={linkClass} to="/admin" onClick={() => setOpen(false)}>Admin</NavLink>}
      </nav>
      <div className="nav-actions">
        {user && <Link className="icon-button wishlist-button" to="/wishlist" aria-label="Wishlist"><Heart size={20} />{wishlistCount > 0 && <span className="nav-count">{wishlistCount}</span>}</Link>}
        <Link className="icon-button cart-button" to="/cart" aria-label="Cart"><ShoppingBag size={20} />{count > 0 && <span className="nav-count">{count}</span>}</Link>
        {user ? <div className="user-menu"><UserRound size={18} /><span>{user.name.split(' ')[0]}</span><button onClick={logout}>Logout</button></div> : <Link className="button button-sm" to="/login">Sign in</Link>}
      </div>
    </div>
  </header>
}
