import {
  AlertTriangle,
  BarChart3,
  Boxes,
  CheckCircle2,
  Copy,
  CreditCard,
  Edit3,
  ExternalLink,
  Eye,
  Filter,
  ImagePlus,
  IndianRupee,
  KeyRound,
  Layers,
  Mail,
  MessageSquare,
  PackageCheck,
  Phone,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  UserCheck,
  UserX,
  Users,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api, { getErrorMessage, resolveImageUrl } from '../services/api'

const emptyProduct = {
  title: '',
  category: 'Keepsakes',
  price: '',
  description: '',
  rating: 4.5,
  discount_percent: 0,
  stock: 10,
  delivery_time: '3-5 business days',
  material: '',
  image_url: '',
  is_featured: false,
}

const statuses = [
  'PLACED',
  'PAYMENT_PENDING',
  'CONFIRMED',
  'PROCESSING',
  'CUSTOMIZING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
]

const contactStatuses = ['New', 'In Progress', 'Resolved']

export default function AdminDashboard() {
  const [tab, setTab] = useState('overview')
  const [stats, setStats] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [products, setProducts] = useState([])
  const [orders, setOrders] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  // Payments State
  const [payments, setPayments] = useState([])
  const [paymentTotal, setPaymentTotal] = useState(0)
  const [paymentFilter, setPaymentFilter] = useState('all')
  const [paymentSearch, setPaymentSearch] = useState('')

  // Inventory State
  const [inventoryItems, setInventoryItems] = useState([])
  const [inventoryFilter, setInventoryFilter] = useState('all') // all, low_stock, out_of_stock
  const [inventorySearch, setInventorySearch] = useState('')
  const [editingStockItem, setEditingStockItem] = useState(null)
  const [stockInput, setStockInput] = useState('')

  // Categories State
  const [categories, setCategories] = useState([])
  const [renamingCategory, setRenamingCategory] = useState(null)
  const [newCategoryName, setNewCategoryName] = useState('')

  // Contact messages state
  const [contactMessages, setContactMessages] = useState([])
  const [contactTotal, setContactTotal] = useState(0)
  const [contactUnread, setContactUnread] = useState(0)
  const [contactFilter, setContactFilter] = useState('all')
  const [contactSearch, setContactSearch] = useState('')
  const [viewingMessage, setViewingMessage] = useState(null)

  // Settings State
  const [storeSettings, setStoreSettings] = useState({
    whatsapp_number: '8485089678',
    whatsapp_country_code: '91',
    whatsapp_available: true,
    whatsapp_enquiry_template: '',
    store_name: 'CustomGift',
    store_email: 'support@customgift.dev',
    store_phone: '+91 84850 89678',
  })
  const [settingsSaving, setSettingsSaving] = useState(false)

  // Recovery Code Modal State
  const [recoveryModal, setRecoveryModal] = useState(null)

  // Product modal state
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyProduct)
  const [showForm, setShowForm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [viewingOrder, setViewingOrder] = useState(null)

  // Load primary dashboard data
  const loadAll = async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const [sRes, aRes, pRes, oRes, uRes] = await Promise.allSettled([
        api.get('/admin/stats'),
        api.get('/admin/analytics'),
        api.get('/products?page_size=50'),
        api.get('/orders/admin/all'),
        api.get('/admin/users'),
      ])

      let primaryFailed = false
      let firstError = null

      if (sRes.status === 'fulfilled') {
        setStats(sRes.value.data)
      } else {
        primaryFailed = true
        firstError = sRes.reason
        console.error('Failed to load stats:', sRes.reason)
      }

      if (aRes.status === 'fulfilled') {
        setAnalytics(aRes.value.data)
      } else {
        console.warn('Failed to load analytics:', aRes.reason)
      }

      if (pRes.status === 'fulfilled') {
        setProducts(pRes.value.data.items || [])
      } else {
        console.warn('Failed to load products:', pRes.reason)
        if (!firstError) firstError = pRes.reason
      }

      if (oRes.status === 'fulfilled') {
        setOrders(oRes.value.data || [])
      } else {
        console.warn('Failed to load orders:', oRes.reason)
        if (!firstError) firstError = oRes.reason
      }

      if (uRes.status === 'fulfilled') {
        setUsers(uRes.value.data || [])
      } else {
        console.warn('Failed to load users:', uRes.reason)
        if (!firstError) firstError = uRes.reason
      }

      if (primaryFailed && !stats) {
        const errorMsg = getErrorMessage(firstError)
        setLoadError(errorMsg)
        toast.error(errorMsg, { id: 'admin-load-error' })
      }
    } catch (error) {
      const errorMsg = getErrorMessage(error)
      setLoadError(errorMsg)
      toast.error(errorMsg, { id: 'admin-load-error' })
    } finally {
      setLoading(false)
    }
  }

  // Load Payments
  const loadPayments = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (paymentFilter && paymentFilter !== 'all') {
        params.append('status', paymentFilter)
      }
      if (paymentSearch.trim()) {
        params.append('search', paymentSearch.trim())
      }
      const { data } = await api.get(`/admin/payments?${params.toString()}`)
      setPayments(data.items || [])
      setPaymentTotal(data.total || 0)
    } catch (error) {
      toast.error(getErrorMessage(error), { id: 'admin-payments-error' })
    }
  }, [paymentFilter, paymentSearch])

  // Load Inventory
  const loadInventory = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (inventoryFilter && inventoryFilter !== 'all') {
        params.append('filter', inventoryFilter)
      }
      if (inventorySearch.trim()) {
        params.append('search', inventorySearch.trim())
      }
      const { data } = await api.get(`/admin/inventory?${params.toString()}`)
      setInventoryItems(data.items || [])
    } catch (error) {
      toast.error(getErrorMessage(error), { id: 'admin-inventory-error' })
    }
  }, [inventoryFilter, inventorySearch])

  // Load Categories
  const loadCategories = async () => {
    try {
      const { data } = await api.get('/admin/categories')
      setCategories(data || [])
    } catch (error) {
      toast.error(getErrorMessage(error), { id: 'admin-categories-error' })
    }
  }

  // Load Settings
  const loadSettings = async () => {
    try {
      const { data } = await api.get('/admin/settings')
      setStoreSettings(data)
    } catch (error) {
      toast.error(getErrorMessage(error), { id: 'admin-settings-error' })
    }
  }

  // Load Contact Messages
  const loadContactMessages = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (contactFilter && contactFilter !== 'all') {
        params.append('status', contactFilter)
      }
      if (contactSearch.trim()) {
        params.append('search', contactSearch.trim())
      }
      const { data } = await api.get(`/admin/contact-messages?${params.toString()}`)
      setContactMessages(data.items || [])
      setContactTotal(data.total || 0)
      setContactUnread(data.unread_count || 0)
    } catch (error) {
      toast.error(getErrorMessage(error), { id: 'admin-contact-error' })
    }
  }, [contactFilter, contactSearch])

  useEffect(() => {
    loadAll()
  }, [])

  useEffect(() => {
    if (tab === 'messages' || tab === 'overview') {
      loadContactMessages()
    }
    if (tab === 'payments') {
      loadPayments()
    }
    if (tab === 'inventory') {
      loadInventory()
    }
    if (tab === 'categories') {
      loadCategories()
    }
    if (tab === 'settings') {
      loadSettings()
    }
  }, [tab, loadContactMessages, loadPayments, loadInventory])

  // Product Actions
  const openCreate = () => {
    setEditing(null)
    setForm(emptyProduct)
    setShowForm(true)
  }

  const openEdit = (product) => {
    setEditing(product.id)
    setForm({ ...emptyProduct, ...product, price: Number(product.price) })
    setShowForm(true)
  }

  const field = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  const uploadImage = async (file) => {
    if (!file) return
    const body = new FormData()
    body.append('file', file)
    try {
      const { data } = await api.post('/products/admin/upload-image', body)
      field('image_url', data.url)
      toast.success('Product image uploaded')
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  const saveProduct = async (e) => {
    e.preventDefault()
    setBusy(true)
    const payload = {
      ...form,
      price: Number(form.price),
      rating: Number(form.rating),
      discount_percent: Number(form.discount_percent),
      stock: Number(form.stock),
    }
    try {
      if (editing) await api.patch(`/products/${editing}`, payload)
      else await api.post('/products', payload)
      toast.success(editing ? 'Product updated' : 'Product created')
      setShowForm(false)
      await loadAll()
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  const removeProduct = async (id) => {
    if (!window.confirm('Remove this product from the storefront?')) return
    try {
      await api.delete(`/products/${id}`)
      toast.success('Product removed')
      await loadAll()
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  // Order Actions
  const updateStatus = async (id, order_status) => {
    try {
      const { data } = await api.patch(`/orders/${id}/status`, { order_status })
      toast.success('Order status updated')
      await loadAll()
      return data
    } catch (error) {
      toast.error(getErrorMessage(error))
      return null
    }
  }

  // Inventory Quick Update
  const handleSaveStock = async (e) => {
    e.preventDefault()
    if (!editingStockItem) return
    try {
      await api.patch(`/admin/inventory/${editingStockItem.id}`, {
        stock: Number(stockInput),
      })
      toast.success(`Updated stock for ${editingStockItem.title}`)
      setEditingStockItem(null)
      loadInventory()
      loadAll()
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  // Category Rename
  const handleRenameCategory = async (e) => {
    e.preventDefault()
    if (!renamingCategory || !newCategoryName.trim()) return
    try {
      const { data } = await api.patch('/admin/categories/rename', {
        old_name: renamingCategory.name,
        new_name: newCategoryName.trim(),
      })
      toast.success(data.message)
      setRenamingCategory(null)
      setNewCategoryName('')
      loadCategories()
      loadAll()
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  // User Actions
  const toggleUserStatus = async (user) => {
    const nextStatus = !user.is_active
    const actionLabel = nextStatus ? 'activate' : 'suspend'
    if (!window.confirm(`Are you sure you want to ${actionLabel} ${user.name}'s account?`)) return
    try {
      const { data } = await api.patch(`/admin/users/${user.id}/status`, {
        is_active: nextStatus,
      })
      toast.success(`Account ${data.is_active ? 'activated' : 'suspended'}`)
      setUsers((prev) => prev.map((u) => (u.id === user.id ? data : u)))
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  const handleResetRecoveryCode = async (user) => {
    if (!window.confirm(`Generate a new emergency recovery code for ${user.email}?`)) return
    try {
      const { data } = await api.post(`/admin/users/${user.id}/reset-recovery-code`)
      setRecoveryModal({
        user,
        code: data.recovery_code,
        message: data.message,
      })
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  // Settings Save
  const handleSaveSettings = async (e) => {
    e.preventDefault()
    setSettingsSaving(true)
    try {
      const { data } = await api.patch('/admin/settings', storeSettings)
      setStoreSettings(data)
      toast.success('Store & WhatsApp settings updated successfully')
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setSettingsSaving(false)
    }
  }

  // Contact Message Handlers
  const openMessageDetail = async (msg) => {
    try {
      const { data } = await api.get(`/admin/contact-messages/${msg.id}`)
      setViewingMessage(data)
      setContactMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, is_read: true } : m))
      )
      loadContactMessages()
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  const updateContactStatus = async (messageId, newStatus) => {
    try {
      const { data } = await api.patch(`/admin/contact-messages/${messageId}/status`, {
        status: newStatus,
      })
      toast.success(`Message marked as ${newStatus}`)
      setContactMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, status: newStatus, is_read: data.is_read } : m))
      )
      if (viewingMessage && viewingMessage.id === messageId) {
        setViewingMessage(data)
      }
      loadContactMessages()
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  const deleteContactMessage = async (messageId) => {
    if (!window.confirm('Are you sure you want to permanently delete this contact submission?')) return
    try {
      await api.delete(`/admin/contact-messages/${messageId}`)
      toast.success('Contact submission deleted')
      setContactMessages((prev) => prev.filter((m) => m.id !== messageId))
      if (viewingMessage && viewingMessage.id === messageId) {
        setViewingMessage(null)
      }
      loadContactMessages()
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  if (loading && !stats) {
    return (
      <div className="page-loader">
        <span className="spinner" />
        <p style={{ marginTop: '16px', color: 'var(--muted)', fontSize: '14px' }}>Loading Admin Dashboard...</p>
      </div>
    )
  }

  if (loadError && !stats) {
    return (
      <div className="admin-page">
        <div className="container" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div
            style={{
              maxWidth: '480px',
              margin: '0 auto',
              background: 'white',
              padding: '36px 24px',
              borderRadius: '20px',
              border: '1px solid var(--line)',
              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)',
            }}
          >
            <AlertTriangle size={44} color="var(--red)" style={{ margin: '0 auto 14px' }} />
            <h2 style={{ margin: '0 0 8px', fontSize: '20px' }}>Unable to Load Admin Dashboard</h2>
            <p style={{ color: 'var(--muted)', fontSize: '13px', margin: '0 0 20px', lineHeight: '1.5' }}>
              {loadError}
            </p>
            <button className="button" type="button" onClick={loadAll} style={{ margin: '0 auto' }}>
              <RefreshCw size={15} /> Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-page">
      <div className="container">
        {/* TOP HEADER */}
        <div className="admin-head">
          <div>
            <span className="eyebrow">Store Operations Center</span>
            <h1>Admin Dashboard</h1>
            <p>
              Manage products, orders, Razorpay online payments, inventory, categories, customer accounts, and inquiries.
            </p>
          </div>
          <button className="button" onClick={openCreate}>
            <Plus size={17} /> Add Product
          </button>
        </div>

        {/* NAVIGATION TABS */}
        <div className="admin-tabs">
          <button
            className={tab === 'overview' ? 'active' : ''}
            onClick={() => setTab('overview')}
          >
            <BarChart3 /> Overview
          </button>
          <button
            className={tab === 'products' ? 'active' : ''}
            onClick={() => setTab('products')}
          >
            <Boxes /> Products
          </button>
          <button
            className={tab === 'orders' ? 'active' : ''}
            onClick={() => setTab('orders')}
          >
            <ShoppingBag /> Orders
          </button>
          <button
            className={tab === 'payments' ? 'active' : ''}
            onClick={() => setTab('payments')}
          >
            <CreditCard /> Payments
          </button>
          <button
            className={tab === 'inventory' ? 'active' : ''}
            onClick={() => setTab('inventory')}
          >
            <AlertTriangle /> Inventory
            {analytics?.low_stock_count > 0 && (
              <span className="admin-tab-badge badge-danger">
                {analytics.low_stock_count}
              </span>
            )}
          </button>
          <button
            className={tab === 'categories' ? 'active' : ''}
            onClick={() => setTab('categories')}
          >
            <Layers /> Categories
          </button>
          <button
            className={tab === 'users' ? 'active' : ''}
            onClick={() => setTab('users')}
          >
            <Users /> Users
          </button>
          <button
            className={tab === 'messages' ? 'active' : ''}
            onClick={() => setTab('messages')}
          >
            <Mail /> Inquiries
            {contactUnread > 0 && (
              <span className="admin-tab-badge">{contactUnread}</span>
            )}
          </button>
          <button
            className={tab === 'settings' ? 'active' : ''}
            onClick={() => setTab('settings')}
          >
            <Settings /> WhatsApp & Settings
          </button>
        </div>

        {/* ===================================================================
            OVERVIEW TAB
           =================================================================== */}
        {tab === 'overview' && (
          <>
            <div className="stats-grid">
              <Stat
                icon={<IndianRupee />}
                label="Paid Revenue"
                value={`₹${Number(stats.revenue).toLocaleString('en-IN')}`}
              />
              <Stat
                icon={<ShoppingBag />}
                label="Total Orders"
                value={stats.orders}
              />
              <Stat
                icon={<PackageCheck />}
                label="Open Orders"
                value={stats.pending_orders}
              />
              <Stat
                icon={<Users />}
                label="Customers"
                value={stats.users}
              />
            </div>

            <div className="admin-overview-grid">
              {/* Recent Orders Section */}
              <section className="admin-panel">
                <div className="panel-head">
                  <h2>Recent Orders</h2>
                  <button onClick={() => setTab('orders')}>View All ({orders.length})</button>
                </div>
                {orders.length === 0 ? (
                  <p style={{ color: 'var(--muted)', padding: '16px 0' }}>No orders placed yet.</p>
                ) : (
                  orders.slice(0, 5).map((order) => (
                    <div className="mini-order" key={order.id}>
                      <span>
                        <strong>{order.order_number}</strong>
                        <small>
                          {order.name} · {order.items?.length || 0} item(s)
                        </small>
                      </span>
                      <span className={`status-badge status-${order.order_status.toLowerCase()}`}>
                        {order.order_status}
                      </span>
                      <b>₹{Number(order.total_amount).toLocaleString('en-IN')}</b>
                    </div>
                  ))
                )}
              </section>

              {/* Store Health & Alerts */}
              <section className="admin-panel">
                <div className="panel-head">
                  <h2>Store Health & Highlights</h2>
                </div>
                <div className="health-list">
                  <span>
                    <b>{stats.products}</b> Active Catalog Products
                  </span>
                  <span>
                    <button
                      type="button"
                      className="inline-admin-link"
                      onClick={() => setTab('inventory')}
                      style={{ border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer', padding: 0 }}
                    >
                      <b style={{ color: analytics?.low_stock_count > 0 ? '#b45309' : 'inherit' }}>
                        {analytics?.low_stock_count || 0}
                      </b>{' '}
                      Products Low on Stock (&lt; 5 units)
                    </button>
                  </span>
                  <span>
                    <button
                      type="button"
                      className="inline-admin-link"
                      onClick={() => setTab('messages')}
                      style={{ border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer', padding: 0 }}
                    >
                      <b style={{ color: contactUnread > 0 ? 'var(--purple)' : 'inherit' }}>
                        {contactUnread}
                      </b>{' '}
                      Unread Customer Inquiries
                    </button>
                  </span>
                  <span>
                    <b>{orders.filter((o) => o.payment_status === 'PAID').length}</b> Verified Paid Orders
                  </span>
                </div>
              </section>
            </div>

            {/* Analytics Breakdown */}
            {analytics && (
              <div style={{ marginTop: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
                <section className="admin-panel">
                  <div className="panel-head">
                    <h2>Orders by Status</h2>
                  </div>
                  <div style={{ display: 'grid', gap: '8px', marginTop: '12px' }}>
                    {Object.entries(analytics.orders_by_status || {}).map(([st, cnt]) => (
                      <div key={st} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#faf8fc', borderRadius: '8px' }}>
                        <span style={{ fontWeight: 600, fontSize: '13px' }}>{st}</span>
                        <span style={{ fontWeight: 800, color: 'var(--purple)' }}>{cnt}</span>
                      </div>
                    ))}
                    {Object.keys(analytics.orders_by_status || {}).length === 0 && (
                      <p style={{ color: 'var(--muted)', fontSize: '13px' }}>No order breakdown available.</p>
                    )}
                  </div>
                </section>

                <section className="admin-panel">
                  <div className="panel-head">
                    <h2>Payment Methods</h2>
                  </div>
                  <div style={{ display: 'grid', gap: '8px', marginTop: '12px' }}>
                    {Object.entries(analytics.payment_methods || {}).map(([pm, cnt]) => (
                      <div key={pm} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#faf8fc', borderRadius: '8px' }}>
                        <span style={{ fontWeight: 600, fontSize: '13px', textTransform: 'uppercase' }}>
                          {pm === 'razorpay' ? 'Razorpay (Online)' : pm === 'cod' ? 'Cash on Delivery (COD)' : pm}
                        </span>
                        <span style={{ fontWeight: 800, color: 'var(--purple)' }}>{cnt}</span>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="admin-panel">
                  <div className="panel-head">
                    <h2>Best Selling Gifts</h2>
                  </div>
                  <div style={{ display: 'grid', gap: '10px', marginTop: '12px' }}>
                    {(analytics.best_sellers || []).slice(0, 5).map((bs) => (
                      <div key={bs.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
                        <img src={resolveImageUrl(bs.image_url)} alt="" style={{ width: '38px', height: '38px', borderRadius: '8px', objectFit: 'cover' }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <strong style={{ display: 'block', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {bs.title}
                          </strong>
                          <small style={{ color: 'var(--muted)' }}>{bs.units_sold} units sold</small>
                        </div>
                        <b style={{ fontSize: '13px' }}>₹{Number(bs.revenue).toLocaleString('en-IN')}</b>
                      </div>
                    ))}
                    {(!analytics.best_sellers || analytics.best_sellers.length === 0) && (
                      <p style={{ color: 'var(--muted)', fontSize: '13px' }}>No sales data yet.</p>
                    )}
                  </div>
                </section>
              </div>
            )}
          </>
        )}

        {/* ===================================================================
            PRODUCTS TAB
           =================================================================== */}
        {tab === 'products' && (
          <section className="admin-panel table-panel">
            <div className="panel-head">
              <div>
                <h2>Store Catalog Products</h2>
                <p>{products.length} catalog gifts available in storefront</p>
              </div>
              <button className="button button-sm" onClick={openCreate}>
                <Plus size={15} /> New Product
              </button>
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id}>
                      <td>
                        <div className="table-product">
                          <img src={resolveImageUrl(product.image_url)} alt="" />
                          <span>
                            <strong>{product.title}</strong>
                            <small>{product.is_featured ? 'Featured Gift' : 'Standard'}</small>
                          </span>
                        </div>
                      </td>
                      <td>{product.category}</td>
                      <td>₹{Number(product.price).toLocaleString('en-IN')}</td>
                      <td>
                        <span
                          className={`stock-pill ${
                            product.stock === 0 ? 'out' : product.stock < 5 ? 'low' : 'ok'
                          }`}
                        >
                          {product.stock === 0 ? 'Out of stock' : `${product.stock} units`}
                        </span>
                      </td>
                      <td>
                        <span className={product.is_active ? 'status-pill-active' : 'status-pill-disabled'}>
                          {product.is_active ? 'Active' : 'Hidden'}
                        </span>
                      </td>
                      <td>
                        <div className="table-actions" style={{ justifyContent: 'flex-end' }}>
                          <button title="Edit product" onClick={() => openEdit(product)}>
                            <Edit3 />
                          </button>
                          <button className="danger" title="Delete product" onClick={() => removeProduct(product.id)}>
                            <Trash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ===================================================================
            ORDERS TAB
           =================================================================== */}
        {tab === 'orders' && (
          <section className="admin-panel table-panel">
            <div className="panel-head">
              <div>
                <h2>Orders & Fulfillment</h2>
                <p>{orders.length} total orders across customer base</p>
              </div>
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Customer</th>
                    <th>Total</th>
                    <th>Payment</th>
                    <th>Order Status</th>
                    <th>Placed On</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <strong>{order.order_number}</strong>
                        <small className="table-sub">
                          {(order.items || []).map((x) => x.product_title).join(', ')}
                        </small>
                      </td>
                      <td>
                        {order.name}
                        <small className="table-sub">{order.email} · {order.phone}</small>
                      </td>
                      <td>₹{Number(order.total_amount).toLocaleString('en-IN')}</td>
                      <td>
                        <span
                          className={`payment-pill ${
                            order.payment_status === 'PAID' ? 'paid' : ''
                          }`}
                        >
                          {order.payment_method?.toUpperCase()} · {order.payment_status}
                        </span>
                      </td>
                      <td>
                        <select
                          className="status-select"
                          value={order.order_status}
                          onChange={(e) => updateStatus(order.id, e.target.value)}
                        >
                          {statuses.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </td>
                      <td>{new Date(order.created_at).toLocaleDateString('en-IN')}</td>
                      <td>
                        <div className="table-actions" style={{ justifyContent: 'flex-end' }}>
                          <button
                            title="View order and customer details"
                            onClick={() => setViewingOrder(order)}
                          >
                            <Eye />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ===================================================================
            PAYMENTS TAB (RAZORPAY TEST MODE AUDIT & TRANSACTIONS)
           =================================================================== */}
        {tab === 'payments' && (
          <div>
            {/* Razorpay Test Mode Banner */}
            <div className="razorpay-test-banner">
              <div className="razorpay-banner-left">
                <div className="razorpay-icon-wrap">
                  <CreditCard size={28} />
                </div>
                <div>
                  <div className="razorpay-badge-pill">
                    <span className="razorpay-pill-dot" /> Test Mode Active
                  </div>
                  <h3 className="razorpay-banner-title">Razorpay Online Payment Gateway</h3>
                  <p className="razorpay-banner-sub">
                    Environment is configured in Razorpay Sandbox mode. Authenticated via backend API credentials.
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  className="button button-sm button-ghost"
                  style={{ color: 'white', borderColor: 'rgba(255,255,255,0.2)' }}
                  onClick={loadPayments}
                >
                  <RefreshCw size={14} /> Refresh Transactions
                </button>
              </div>
            </div>

            <section className="admin-panel table-panel">
              <div className="panel-head">
                <div>
                  <h2>Payment Transactions ({paymentTotal})</h2>
                  <p>Real-time log of Razorpay orders, payments, and settlements</p>
                </div>
                <div className="contact-admin-controls">
                  <div className="admin-search-wrap">
                    <Search size={15} />
                    <input
                      type="text"
                      placeholder="Search Razorpay ID, order #, email..."
                      value={paymentSearch}
                      onChange={(e) => setPaymentSearch(e.target.value)}
                    />
                    {paymentSearch && (
                      <button
                        type="button"
                        className="search-clear-mini"
                        onClick={() => setPaymentSearch('')}
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>
                  <div className="admin-filter-wrap">
                    <Filter size={15} />
                    <select
                      value={paymentFilter}
                      onChange={(e) => setPaymentFilter(e.target.value)}
                    >
                      <option value="all">All Statuses</option>
                      <option value="SUCCESS">SUCCESS</option>
                      <option value="CREATED">CREATED</option>
                      <option value="FAILED">FAILED</option>
                    </select>
                  </div>
                </div>
              </div>

              {payments.length === 0 ? (
                <div className="admin-empty-state">
                  <CreditCard size={32} />
                  <p>No Razorpay payment transactions found matching the filter.</p>
                </div>
              ) : (
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Transaction ID</th>
                        <th>Razorpay Order ID</th>
                        <th>CustomGift Order</th>
                        <th>Customer</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Date & Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((p) => (
                        <tr key={p.id}>
                          <td>
                            <strong>{p.razorpay_payment_id || '—'}</strong>
                            <small className="table-sub">{p.method}</small>
                          </td>
                          <td>
                            <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                              {p.razorpay_order_id || '—'}
                            </span>
                          </td>
                          <td>
                            <strong>{p.order_number || `Order #${p.order_id}`}</strong>
                          </td>
                          <td>{p.user_email || '—'}</td>
                          <td>
                            <strong>₹{Number(p.amount).toLocaleString('en-IN')}</strong>
                          </td>
                          <td>
                            <span
                              className={`payment-pill ${
                                p.status === 'SUCCESS' ? 'paid' : ''
                              }`}
                            >
                              {p.status}
                            </span>
                          </td>
                          <td>
                            {new Date(p.created_at).toLocaleString('en-IN', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}

        {/* ===================================================================
            INVENTORY TAB
           =================================================================== */}
        {tab === 'inventory' && (
          <section className="admin-panel table-panel">
            <div className="panel-head">
              <div>
                <h2>Real-Time Inventory Management</h2>
                <p>Track stock levels, monitor low stock alerts (&lt; 5 units), and update units instantly</p>
              </div>
              <div className="contact-admin-controls">
                <div className="admin-search-wrap">
                  <Search size={15} />
                  <input
                    type="text"
                    placeholder="Search product title or category..."
                    value={inventorySearch}
                    onChange={(e) => setInventorySearch(e.target.value)}
                  />
                  {inventorySearch && (
                    <button
                      type="button"
                      className="search-clear-mini"
                      onClick={() => setInventorySearch('')}
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
                <div className="admin-filter-wrap">
                  <Filter size={15} />
                  <select
                    value={inventoryFilter}
                    onChange={(e) => setInventoryFilter(e.target.value)}
                  >
                    <option value="all">All Products</option>
                    <option value="low_stock">Low Stock (&lt; 5 units)</option>
                    <option value="out_of_stock">Out of Stock (0 units)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Stock Level</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {inventoryItems.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="table-product">
                          <img src={resolveImageUrl(item.image_url)} alt="" />
                          <span>
                            <strong>{item.title}</strong>
                            <small>ID: #{item.id}</small>
                          </span>
                        </div>
                      </td>
                      <td>{item.category}</td>
                      <td>₹{Number(item.price).toLocaleString('en-IN')}</td>
                      <td>
                        <span
                          className={`stock-pill ${
                            item.stock === 0 ? 'out' : item.stock < 5 ? 'low' : 'ok'
                          }`}
                        >
                          {item.stock === 0 ? '0 units (Out of stock)' : `${item.stock} units`}
                        </span>
                      </td>
                      <td>
                        <span className={item.is_active ? 'status-pill-active' : 'status-pill-disabled'}>
                          {item.is_active ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td>
                        <div className="table-actions" style={{ justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="button button-sm button-ghost"
                            onClick={() => {
                              setEditingStockItem(item)
                              setStockInput(String(item.stock))
                            }}
                          >
                            <Edit3 size={14} /> Adjust Stock
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ===================================================================
            CATEGORIES TAB
           =================================================================== */}
        {tab === 'categories' && (
          <section className="admin-panel">
            <div className="panel-head">
              <div>
                <h2>Store Categories ({categories.length})</h2>
                <p>Manage product catalog taxonomies and batch-rename categories across all active items</p>
              </div>
            </div>

            <div className="category-card-grid">
              {categories.map((cat) => (
                <div className="category-card" key={cat.name}>
                  <div className="category-card-info">
                    <h4>{cat.name}</h4>
                    <span>
                      {cat.product_count} product(s) · {cat.active_count} active
                    </span>
                  </div>
                  <button
                    type="button"
                    className="button button-sm button-ghost"
                    onClick={() => {
                      setRenamingCategory(cat)
                      setNewCategoryName(cat.name)
                    }}
                  >
                    <Edit3 size={14} /> Rename
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ===================================================================
            USERS TAB
           =================================================================== */}
        {tab === 'users' && (
          <section className="admin-panel table-panel">
            <div className="panel-head">
              <div>
                <h2>Registered Users ({users.length})</h2>
                <p>Customer accounts, roles, access status, and recovery assistance</p>
              </div>
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Registered</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <strong>{user.name}</strong>
                      </td>
                      <td>{user.email}</td>
                      <td>{user.phone || '—'}</td>
                      <td>
                        <span className="role-pill">{user.role}</span>
                      </td>
                      <td>
                        <span className={user.is_active ? 'status-pill-active' : 'status-pill-disabled'}>
                          {user.is_active ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td>{user.created_at ? new Date(user.created_at).toLocaleDateString('en-IN') : '—'}</td>
                      <td>
                        <div className="table-actions" style={{ justifyContent: 'flex-end', gap: '8px' }}>
                          <button
                            type="button"
                            className="button button-sm button-ghost"
                            title={user.is_active ? 'Suspend Account' : 'Activate Account'}
                            onClick={() => toggleUserStatus(user)}
                          >
                            {user.is_active ? <UserX size={14} /> : <UserCheck size={14} />}
                            {user.is_active ? 'Suspend' : 'Activate'}
                          </button>
                          <button
                            type="button"
                            className="button button-sm button-ghost"
                            title="Generate emergency recovery code for customer"
                            onClick={() => handleResetRecoveryCode(user)}
                          >
                            <KeyRound size={14} /> Reset Recovery
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ===================================================================
            CONTACT INQUIRIES TAB
           =================================================================== */}
        {tab === 'messages' && (
          <section className="admin-panel table-panel contact-admin-panel">
            <div className="panel-head">
              <div>
                <h2>Customer Inquiries</h2>
                <p>
                  {contactTotal} total submission(s) · {contactUnread} unread
                </p>
              </div>
              <div className="contact-admin-controls">
                <div className="admin-search-wrap">
                  <Search size={15} />
                  <input
                    type="text"
                    placeholder="Search name, email, subject..."
                    value={contactSearch}
                    onChange={(e) => setContactSearch(e.target.value)}
                  />
                  {contactSearch && (
                    <button
                      type="button"
                      className="search-clear-mini"
                      onClick={() => setContactSearch('')}
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                <div className="admin-filter-wrap">
                  <Filter size={15} />
                  <select
                    value={contactFilter}
                    onChange={(e) => setContactFilter(e.target.value)}
                  >
                    <option value="all">All statuses</option>
                    <option value="New">New</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                </div>
              </div>
            </div>

            {contactMessages.length === 0 ? (
              <div className="admin-empty-state">
                <Mail size={32} />
                <p>No customer messages found matching the selected filters.</p>
              </div>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>Sender</th>
                      <th>Subject</th>
                      <th>Date</th>
                      <th>Read</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contactMessages.map((msg) => (
                      <tr
                        key={msg.id}
                        className={!msg.is_read ? 'unread-row' : ''}
                      >
                        <td>
                          <span
                            className={`contact-status-pill status-${msg.status
                              .toLowerCase()
                              .replace(' ', '-')}`}
                          >
                            {msg.status}
                          </span>
                        </td>
                        <td>
                          <strong>{msg.name}</strong>
                          <small className="table-sub">{msg.email}</small>
                        </td>
                        <td>
                          <span className="contact-subject-preview">
                            {msg.subject}
                          </span>
                        </td>
                        <td>
                          {new Date(msg.created_at).toLocaleDateString('en-IN', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </td>
                        <td>
                          {msg.is_read ? (
                            <span className="read-flag read">Read</span>
                          ) : (
                            <span className="read-flag unread">New</span>
                          )}
                        </td>
                        <td>
                          <div
                            className="table-actions"
                            style={{ justifyContent: 'flex-end' }}
                          >
                            <button
                              title="View inquiry details"
                              onClick={() => openMessageDetail(msg)}
                            >
                              <Eye size={16} />
                            </button>
                            <select
                              className="status-select-mini"
                              value={msg.status}
                              onChange={(e) =>
                                updateContactStatus(msg.id, e.target.value)
                              }
                              title="Update submission status"
                            >
                              {contactStatuses.map((st) => (
                                <option key={st} value={st}>
                                  {st}
                                </option>
                              ))}
                            </select>
                            <button
                              className="danger"
                              title="Delete submission"
                              onClick={() => deleteContactMessage(msg.id)}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* ===================================================================
            WHATSAPP & STORE SETTINGS TAB
           =================================================================== */}
        {tab === 'settings' && (
          <form onSubmit={handleSaveSettings}>
            <div className="settings-grid">
              {/* WhatsApp Contact Settings */}
              <div className="settings-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <MessageSquare size={22} color="var(--purple)" />
                  <h3 style={{ margin: 0 }}>WhatsApp Customization Channel</h3>
                </div>
                <p>
                  Configure the official WhatsApp business number where customers connect to personalize gifts.
                </p>

                <div className="form-grid two" style={{ marginBottom: '16px' }}>
                  <label>
                    Country Code
                    <input
                      type="text"
                      required
                      value={storeSettings.whatsapp_country_code}
                      onChange={(e) =>
                        setStoreSettings({
                          ...storeSettings,
                          whatsapp_country_code: e.target.value,
                        })
                      }
                      placeholder="e.g. 91"
                    />
                  </label>
                  <label>
                    WhatsApp Phone Number
                    <input
                      type="text"
                      required
                      value={storeSettings.whatsapp_number}
                      onChange={(e) =>
                        setStoreSettings({
                          ...storeSettings,
                          whatsapp_number: e.target.value,
                        })
                      }
                      placeholder="e.g. 8485089678"
                    />
                  </label>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <Switch
                    label="WhatsApp Chat Integration Active"
                    checked={storeSettings.whatsapp_available}
                    onChange={(checked) =>
                      setStoreSettings({
                        ...storeSettings,
                        whatsapp_available: checked,
                      })
                    }
                  />
                </div>

                <label>
                  Default Enquiry Message Template
                  <textarea
                    rows="5"
                    required
                    value={storeSettings.whatsapp_enquiry_template}
                    onChange={(e) =>
                      setStoreSettings({
                        ...storeSettings,
                        whatsapp_enquiry_template: e.target.value,
                      })
                    }
                    placeholder="Message sent when customer clicks WhatsApp..."
                  />
                  <small style={{ color: 'var(--muted)', display: 'block', marginTop: '4px' }}>
                    Supported placeholders: <code>{'{title}'}</code>, <code>{'{id}'}</code>, <code>{'{url}'}</code>
                  </small>
                </label>
              </div>

              {/* General Store Information */}
              <div className="settings-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <Settings size={22} color="var(--purple)" />
                  <h3 style={{ margin: 0 }}>Store Identity & Contact</h3>
                </div>
                <p>Official store details displayed in emails, order receipts, and invoices.</p>

                <div className="form-grid" style={{ marginBottom: '16px' }}>
                  <label>
                    Store Name
                    <input
                      type="text"
                      required
                      value={storeSettings.store_name}
                      onChange={(e) =>
                        setStoreSettings({
                          ...storeSettings,
                          store_name: e.target.value,
                        })
                      }
                    />
                  </label>
                  <label>
                    Support Email Address
                    <input
                      type="email"
                      required
                      value={storeSettings.store_email}
                      onChange={(e) =>
                        setStoreSettings({
                          ...storeSettings,
                          store_email: e.target.value,
                        })
                      }
                    />
                  </label>
                  <label>
                    Customer Support Phone
                    <input
                      type="text"
                      required
                      value={storeSettings.store_phone}
                      onChange={(e) =>
                        setStoreSettings({
                          ...storeSettings,
                          store_phone: e.target.value,
                        })
                      }
                    />
                  </label>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="button" type="submit" disabled={settingsSaving}>
                <Save size={16} /> {settingsSaving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ===================================================================
          MODALS
         =================================================================== */}

      {/* 1. STOCK ADJUSTMENT MODAL */}
      {editingStockItem && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => e.target === e.currentTarget && setEditingStockItem(null)}
        >
          <div className="product-modal" style={{ maxWidth: '440px' }}>
            <div className="modal-head">
              <div>
                <span className="eyebrow">Inventory Control</span>
                <h2>Adjust Stock Units</h2>
              </div>
              <button type="button" onClick={() => setEditingStockItem(null)}>
                <X />
              </button>
            </div>
            <form onSubmit={handleSaveStock}>
              <div className="modal-scroll">
                <p style={{ margin: 0, fontSize: '14px' }}>
                  Product: <strong>{editingStockItem.title}</strong>
                </p>
                <label>
                  Available Stock Units
                  <input
                    type="number"
                    min="0"
                    required
                    value={stockInput}
                    onChange={(e) => setStockInput(e.target.value)}
                  />
                  <small style={{ color: 'var(--muted)' }}>
                    Setting to 0 marks the product as out of stock on the storefront.
                  </small>
                </label>
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="button button-ghost"
                  onClick={() => setEditingStockItem(null)}
                >
                  Cancel
                </button>
                <button className="button" type="submit">
                  <Save size={15} /> Update Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. RENAME CATEGORY MODAL */}
      {renamingCategory && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => e.target === e.currentTarget && setRenamingCategory(null)}
        >
          <div className="product-modal" style={{ maxWidth: '440px' }}>
            <div className="modal-head">
              <div>
                <span className="eyebrow">Category Taxonomies</span>
                <h2>Rename Category</h2>
              </div>
              <button type="button" onClick={() => setRenamingCategory(null)}>
                <X />
              </button>
            </div>
            <form onSubmit={handleRenameCategory}>
              <div className="modal-scroll">
                <p style={{ margin: 0, fontSize: '14px' }}>
                  Renaming <strong>{renamingCategory.name}</strong> will update all{' '}
                  <strong>{renamingCategory.product_count}</strong> associated products in the database.
                </p>
                <label>
                  New Category Name
                  <input
                    type="text"
                    required
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                  />
                </label>
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="button button-ghost"
                  onClick={() => setRenamingCategory(null)}
                >
                  Cancel
                </button>
                <button className="button" type="submit">
                  <Save size={15} /> Update All Products
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. RECOVERY CODE MODAL */}
      {recoveryModal && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => e.target === e.currentTarget && setRecoveryModal(null)}
        >
          <div className="product-modal" style={{ maxWidth: '480px' }}>
            <div className="modal-head">
              <div>
                <span className="eyebrow">Account Recovery Assistance</span>
                <h2>New Emergency Recovery Code</h2>
              </div>
              <button type="button" onClick={() => setRecoveryModal(null)}>
                <X />
              </button>
            </div>
            <div className="modal-scroll">
              <p style={{ margin: 0, fontSize: '14px' }}>
                A new secure emergency recovery code has been generated for <strong>{recoveryModal.user.email}</strong>.
              </p>
              <div className="recovery-code-box">
                <div className="recovery-code-val">{recoveryModal.code}</div>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0 }}>
                Provide this 16-character code directly to the verified account owner so they can reset their password securely.
              </p>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="button button-ghost"
                onClick={() => {
                  navigator.clipboard.writeText(recoveryModal.code)
                  toast.success('Recovery code copied to clipboard!')
                }}
              >
                <Copy size={15} /> Copy Code
              </button>
              <button
                type="button"
                className="button"
                onClick={() => setRecoveryModal(null)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. VIEW CONTACT MESSAGE DETAIL MODAL */}
      {viewingMessage && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => e.target === e.currentTarget && setViewingMessage(null)}
        >
          <div className="product-modal contact-detail-modal">
            <div className="modal-head">
              <div>
                <span className="eyebrow">Customer Inquiry #{viewingMessage.id}</span>
                <h2>{viewingMessage.subject}</h2>
              </div>
              <button type="button" onClick={() => setViewingMessage(null)}>
                <X />
              </button>
            </div>

            <div className="modal-scroll contact-detail-scroll">
              <div className="contact-detail-meta">
                <div>
                  <small>Sender</small>
                  <strong>{viewingMessage.name}</strong>
                  <span>
                    <a
                      href={`mailto:${viewingMessage.email}?subject=Re: ${encodeURIComponent(
                        viewingMessage.subject
                      )}`}
                      className="contact-mailto-link"
                    >
                      {viewingMessage.email}
                    </a>
                  </span>
                </div>
                <div>
                  <small>Received On</small>
                  <strong>
                    {new Date(viewingMessage.created_at).toLocaleString('en-IN', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </strong>
                </div>
                <div>
                  <small>Lifecycle Status</small>
                  <select
                    className="status-select"
                    value={viewingMessage.status}
                    onChange={(e) =>
                      updateContactStatus(viewingMessage.id, e.target.value)
                    }
                  >
                    {contactStatuses.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="contact-body-box">
                <small className="contact-body-label">Customer Message</small>
                <p className="contact-body-text">{viewingMessage.message}</p>
              </div>
            </div>

            <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
              <button
                type="button"
                className="button button-danger-outline"
                onClick={() => deleteContactMessage(viewingMessage.id)}
              >
                <Trash2 size={15} /> Delete Inquiry
              </button>
              <div style={{ display: 'flex', gap: '8px' }}>
                <a
                  href={`mailto:${viewingMessage.email}?subject=Re: ${encodeURIComponent(
                    viewingMessage.subject
                  )}`}
                  className="button button-md"
                >
                  <Mail size={15} /> Reply via Email
                </a>
                <button
                  type="button"
                  className="button button-ghost"
                  onClick={() => setViewingMessage(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. VIEW ORDER DETAIL MODAL */}
      {viewingOrder && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => e.target === e.currentTarget && setViewingOrder(null)}
        >
          <div className="product-modal order-review-modal">
            <div className="modal-head">
              <div>
                <span className="eyebrow">Order Details & Fulfillment</span>
                <h2>{viewingOrder.order_number}</h2>
              </div>
              <button type="button" onClick={() => setViewingOrder(null)}>
                <X />
              </button>
            </div>
            <div className="modal-scroll order-review-scroll">
              <div className="order-review-meta">
                <div>
                  <small>Customer</small>
                  <strong>{viewingOrder.name}</strong>
                  <span>
                    {viewingOrder.email} · {viewingOrder.phone}
                  </span>
                </div>
                <div>
                  <small>Shipping Address</small>
                  <strong>
                    {viewingOrder.city}, {viewingOrder.state}
                  </strong>
                  <span>
                    {viewingOrder.address}
                    {viewingOrder.address_line2 ? `, ${viewingOrder.address_line2}` : ''}
                    {viewingOrder.landmark ? ` (Near ${viewingOrder.landmark})` : ''} · PIN: {viewingOrder.pincode}
                  </span>
                </div>
                <div>
                  <small>Payment</small>
                  <strong>
                    {viewingOrder.payment_method.toUpperCase()} · {viewingOrder.payment_status}
                  </strong>
                  <span>Total: ₹{Number(viewingOrder.total_amount).toLocaleString('en-IN')}</span>
                </div>
              </div>
              <div className="admin-personalization-list">
                {(viewingOrder.items || []).map((item) => (
                  <article className="admin-personalization-item" key={item.id}>
                    <img
                      className="admin-product-thumb"
                      src={resolveImageUrl(item.product_image_url)}
                      alt={item.product_title}
                    />
                    <div className="admin-personalization-copy">
                      <h3>{item.product_title}</h3>
                      <p>
                        Qty {item.quantity} · ₹
                        {Number(item.unit_price).toLocaleString('en-IN')} each
                      </p>
                      <div className="personalization-fields">
                        {item.occasion && (
                          <span>
                            <small>Occasion</small>
                            {item.occasion}
                          </span>
                        )}
                        {item.custom_text && (
                          <span>
                            <small>Custom Note</small>
                            {item.custom_text}
                          </span>
                        )}
                        {item.event_date && (
                          <span>
                            <small>Event Date</small>
                            {item.event_date}
                          </span>
                        )}
                        {!item.occasion && !item.custom_text && !item.event_date && (
                          <span>
                            <small>Customization</small>Direct / WhatsApp Enquiry
                          </span>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
            <div className="modal-actions">
              <select
                className="status-select"
                value={viewingOrder.order_status}
                onChange={async (e) => {
                  const updated = await updateStatus(viewingOrder.id, e.target.value)
                  if (updated) setViewingOrder(updated)
                }}
              >
                {statuses.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
              <button
                type="button"
                className="button button-ghost"
                onClick={() => setViewingOrder(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. CREATE / EDIT PRODUCT MODAL */}
      {showForm && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => e.target === e.currentTarget && setShowForm(false)}
        >
          <form className="product-modal" onSubmit={saveProduct}>
            <div className="modal-head">
              <div>
                <span className="eyebrow">Catalog Manager</span>
                <h2>{editing ? 'Edit Product' : 'Add New Product'}</h2>
              </div>
              <button type="button" onClick={() => setShowForm(false)}>
                <X />
              </button>
            </div>
            <div className="modal-scroll">
              <div className="form-grid two">
                <label>
                  Product Title
                  <input
                    required
                    value={form.title}
                    onChange={(e) => field('title', e.target.value)}
                  />
                </label>
                <label>
                  Category
                  <input
                    required
                    value={form.category}
                    onChange={(e) => field('category', e.target.value)}
                  />
                </label>
              </div>
              <div className="form-grid three">
                <label>
                  Price (₹)
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    value={form.price}
                    onChange={(e) => field('price', e.target.value)}
                  />
                </label>
                <label>
                  Stock
                  <input
                    type="number"
                    min="0"
                    required
                    value={form.stock}
                    onChange={(e) => field('stock', e.target.value)}
                  />
                </label>
                <label>
                  Rating
                  <input
                    type="number"
                    min="0"
                    max="5"
                    step="0.1"
                    value={form.rating}
                    onChange={(e) => field('rating', e.target.value)}
                  />
                </label>
              </div>
              <label>
                Description
                <textarea
                  rows="4"
                  required
                  value={form.description}
                  onChange={(e) => field('description', e.target.value)}
                />
              </label>
              <div className="form-grid two">
                <label>
                  Material
                  <input
                    value={form.material || ''}
                    onChange={(e) => field('material', e.target.value)}
                  />
                </label>
                <label>
                  Delivery Time
                  <input
                    value={form.delivery_time || ''}
                    onChange={(e) => field('delivery_time', e.target.value)}
                  />
                </label>
              </div>
              <label className="admin-upload">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => uploadImage(e.target.files?.[0])}
                />
                <ImagePlus />{' '}
                <span>{form.image_url ? 'Replace Product Image' : 'Upload Product Image'}</span>
              </label>
              {form.image_url && (
                <img
                  className="modal-image-preview"
                  src={resolveImageUrl(form.image_url)}
                  alt="Preview"
                />
              )}
              <div className="switch-grid">
                <Switch
                  label="Featured on Homepage"
                  checked={form.is_featured}
                  onChange={(v) => field('is_featured', v)}
                />
              </div>
              <div className="form-grid">
                <label>
                  Discount %
                  <input
                    type="number"
                    min="0"
                    max="90"
                    value={form.discount_percent}
                    onChange={(e) => field('discount_percent', e.target.value)}
                  />
                </label>
              </div>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="button button-ghost"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>
              <button className="button" disabled={busy}>
                <Save size={16} /> {busy ? 'Saving...' : 'Save Product'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

function Stat({ icon, label, value }) {
  return (
    <article className="stat-card">
      <span>{icon}</span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </article>
  )
}

function Switch({ label, checked, onChange }) {
  return (
    <label className="switch-row">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{label}</span>
    </label>
  )
}
