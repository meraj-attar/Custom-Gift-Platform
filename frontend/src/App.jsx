import {
  Route,
  Routes,
  useLocation,
} from 'react-router-dom'

import { useEffect } from 'react'

import Navbar from './components/Navbar'
import Footer from './components/Footer'
import SignOutConfirmationModal from './components/SignOutConfirmationModal'

import {
  AdminRoute,
  ProtectedRoute,
} from './components/ProtectedRoute'

import Home from './pages/Home'
import Shop from './pages/Shop'
import ProductDetails from './pages/ProductDetails'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Orders from './pages/Orders'
import OrderDetails from './pages/OrderDetails'
import About from './pages/About'
import Contact from './pages/Contact'
import AdminDashboard from './pages/AdminDashboard'
import Wishlist from './pages/Wishlist'
import Profile from './pages/Profile'
import NotFound from './pages/NotFound'


function ScrollTop() {
  const { pathname } =
    useLocation()

  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }, [pathname])

  return null
}


export default function App() {
  return (
    <div className="app-shell">
      <ScrollTop />

      <Navbar />

      <main className="app-main">
        <Routes>
          <Route
            path="/"
            element={<Home />}
          />

          <Route
            path="/shop"
            element={<Shop />}
          />

          <Route
            path="/products/:slug"
            element={
              <ProductDetails />
            }
          />

          <Route
            path="/cart"
            element={<Cart />}
          />

          <Route
            path="/wishlist"
            element={
              <ProtectedRoute>
                <Wishlist />
              </ProtectedRoute>
            }
          />

          <Route
            path="/checkout"
            element={
              <ProtectedRoute>
                <Checkout />
              </ProtectedRoute>
            }
          />

          <Route
            path="/login"
            element={<Login />}
          />

          <Route
            path="/register"
            element={<Register />}
          />

          <Route
            path="/forgot-password"
            element={
              <ForgotPassword />
            }
          />

          <Route
            path="/reset-password"
            element={
              <ResetPassword />
            }
          />

          <Route
            path="/orders"
            element={
              <ProtectedRoute>
                <Orders />
              </ProtectedRoute>
            }
          />

          <Route
            path="/orders/:id"
            element={
              <ProtectedRoute>
                <OrderDetails />
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />

          <Route
            path="/about"
            element={<About />}
          />

          <Route
            path="/contact"
            element={<Contact />}
          />

          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            }
          />

          <Route
            path="*"
            element={<NotFound />}
          />
        </Routes>
      </main>

      <Footer />
      <SignOutConfirmationModal />
    </div>
  )
}