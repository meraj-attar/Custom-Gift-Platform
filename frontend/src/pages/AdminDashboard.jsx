import { BarChart3, Boxes, Edit3, Eye, ImagePlus, IndianRupee, PackageCheck, Plus, Save, ShoppingBag, Trash2, Users, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api, { getErrorMessage, resolveImageUrl } from '../services/api'
import CustomizationImage from '../components/CustomizationImage'

const emptyProduct = {
  title: '', category: 'Keepsakes', price: '', description: '', rating: 4.5, discount_percent: 0,
  stock: 10, customizable: true, delivery_time: '3-5 business days', material: '', image_url: '',
  needs_image: false, needs_text: true, needs_date: false, max_text_length: 120, is_featured: false,
}
const statuses = ['PAYMENT_PENDING', 'CONFIRMED', 'PROCESSING', 'CUSTOMIZING', 'SHIPPED', 'DELIVERED', 'CANCELLED']

export default function AdminDashboard() {
  const [tab, setTab] = useState('overview')
  const [stats, setStats] = useState(null)
  const [products, setProducts] = useState([])
  const [orders, setOrders] = useState([])
  const [users, setUsers] = useState([])
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyProduct)
  const [showForm, setShowForm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [viewingOrder, setViewingOrder] = useState(null)

  const loadAll = async () => {
    try {
      const [s, p, o, u] = await Promise.all([
        api.get('/admin/stats'), api.get('/products?page_size=50'), api.get('/orders/admin/all'), api.get('/admin/users'),
      ])
      setStats(s.data); setProducts(p.data.items); setOrders(o.data); setUsers(u.data)
    } catch (error) { toast.error(getErrorMessage(error)) }
  }
  useEffect(() => { loadAll() }, [])

  const openCreate = () => { setEditing(null); setForm(emptyProduct); setShowForm(true) }
  const openEdit = (product) => {
    setEditing(product.id)
    setForm({ ...emptyProduct, ...product, price: Number(product.price) })
    setShowForm(true)
  }
  const field = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  const uploadImage = async (file) => {
    if (!file) return
    const body = new FormData(); body.append('file', file)
    try {
      const { data } = await api.post('/products/admin/upload-image', body)
      field('image_url', data.url); toast.success('Product image uploaded')
    } catch (error) { toast.error(getErrorMessage(error)) }
  }

  const saveProduct = async (e) => {
    e.preventDefault(); setBusy(true)
    const payload = { ...form, price: Number(form.price), rating: Number(form.rating), discount_percent: Number(form.discount_percent), stock: Number(form.stock), max_text_length: Number(form.max_text_length) }
    try {
      if (editing) await api.patch(`/products/${editing}`, payload)
      else await api.post('/products', payload)
      toast.success(editing ? 'Product updated' : 'Product created'); setShowForm(false); await loadAll()
    } catch (error) { toast.error(getErrorMessage(error)) } finally { setBusy(false) }
  }

  const removeProduct = async (id) => {
    if (!window.confirm('Remove this product from the storefront?')) return
    try { await api.delete(`/products/${id}`); toast.success('Product removed'); await loadAll() } catch (error) { toast.error(getErrorMessage(error)) }
  }

  const updateStatus = async (id, order_status) => {
    try {
      const { data } = await api.patch(`/orders/${id}/status`, { order_status })
      toast.success('Order status updated'); await loadAll(); return data
    } catch (error) { toast.error(getErrorMessage(error)); return null }
  }

  if (!stats) return <div className="page-loader"><span className="spinner" /></div>

  return <div className="admin-page"><div className="container">
    <div className="admin-head"><div><span className="eyebrow">Operations center</span><h1>Admin dashboard</h1><p>Manage products, customers, personalized orders and fulfillment.</p></div><button className="button" onClick={openCreate}><Plus size={17} /> Add product</button></div>
    <div className="admin-tabs"><button className={tab === 'overview' ? 'active' : ''} onClick={() => setTab('overview')}><BarChart3 /> Overview</button><button className={tab === 'products' ? 'active' : ''} onClick={() => setTab('products')}><Boxes /> Products</button><button className={tab === 'orders' ? 'active' : ''} onClick={() => setTab('orders')}><ShoppingBag /> Orders</button><button className={tab === 'users' ? 'active' : ''} onClick={() => setTab('users')}><Users /> Users</button></div>

    {tab === 'overview' && <><div className="stats-grid"><Stat icon={<IndianRupee />} label="Paid revenue" value={`₹${Number(stats.revenue).toLocaleString('en-IN')}`} /><Stat icon={<ShoppingBag />} label="Total orders" value={stats.orders} /><Stat icon={<PackageCheck />} label="Open orders" value={stats.pending_orders} /><Stat icon={<Users />} label="Customers" value={stats.users} /></div><div className="admin-overview-grid"><section className="admin-panel"><div className="panel-head"><h2>Recent orders</h2><button onClick={() => setTab('orders')}>View all</button></div>{orders.slice(0,5).map((order) => <div className="mini-order" key={order.id}><span><strong>{order.order_number}</strong><small>{order.name} · {order.items.length} item(s)</small></span><span className={`status-badge status-${order.order_status.toLowerCase()}`}>{order.order_status}</span><b>₹{Number(order.total_amount).toLocaleString('en-IN')}</b></div>)}</section><section className="admin-panel"><div className="panel-head"><h2>Store health</h2></div><div className="health-list"><span><b>{stats.products}</b> active products</span><span><b>{stats.messages}</b> unread contact messages</span><span><b>{orders.filter((o) => o.payment_status === 'PAID').length}</b> paid orders</span><span><b>{products.filter((p) => p.stock <= 5).length}</b> low-stock products</span></div></section></div></>}

    {tab === 'products' && <section className="admin-panel table-panel"><div className="panel-head"><div><h2>Products</h2><p>{products.length} active storefront items</p></div><button className="button button-sm" onClick={openCreate}><Plus size={15} /> New product</button></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Personalization</th><th /></tr></thead><tbody>{products.map((product) => <tr key={product.id}><td><div className="table-product"><img src={resolveImageUrl(product.image_url)} alt="" /><span><strong>{product.title}</strong><small>{product.is_featured ? 'Featured' : 'Standard'}</small></span></div></td><td>{product.category}</td><td>₹{Number(product.price).toLocaleString('en-IN')}</td><td><span className={product.stock <= 5 ? 'stock-low' : ''}>{product.stock}</span></td><td>{[product.needs_image && 'Photo', product.needs_text && 'Text', product.needs_date && 'Date'].filter(Boolean).join(' · ') || 'None'}</td><td><div className="table-actions"><button onClick={() => openEdit(product)}><Edit3 /></button><button className="danger" onClick={() => removeProduct(product.id)}><Trash2 /></button></div></td></tr>)}</tbody></table></div></section>}

    {tab === 'orders' && <section className="admin-panel table-panel"><div className="panel-head"><div><h2>Orders</h2><p>Customer fulfillment and payment status</p></div></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Payment</th><th>Status</th><th>Placed</th><th /></tr></thead><tbody>{orders.map((order) => <tr key={order.id}><td><strong>{order.order_number}</strong><small className="table-sub">{order.items.map((x) => x.product_title).join(', ')}</small></td><td>{order.name}<small className="table-sub">{order.email}</small></td><td>₹{Number(order.total_amount).toLocaleString('en-IN')}</td><td><span className={`payment-pill ${order.payment_status === 'PAID' ? 'paid' : ''}`}>{order.payment_method.toUpperCase()} · {order.payment_status}</span></td><td><select className="status-select" value={order.order_status} onChange={(e) => updateStatus(order.id, e.target.value)}>{statuses.map((s) => <option key={s}>{s}</option>)}</select></td><td>{new Date(order.created_at).toLocaleDateString('en-IN')}</td><td><div className="table-actions"><button title="View personalization" onClick={() => setViewingOrder(order)}><Eye /></button></div></td></tr>)}</tbody></table></div></section>}

    {tab === 'users' && <section className="admin-panel table-panel"><div className="panel-head"><div><h2>Users</h2><p>Registered accounts and roles</p></div></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Status</th></tr></thead><tbody>{users.map((user) => <tr key={user.id}><td><strong>{user.name}</strong></td><td>{user.email}</td><td>{user.phone || '—'}</td><td><span className="role-pill">{user.role}</span></td><td>{user.is_active ? 'Active' : 'Disabled'}</td></tr>)}</tbody></table></div></section>}
  </div>


  {viewingOrder && <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setViewingOrder(null)}><div className="product-modal order-review-modal"><div className="modal-head"><div><span className="eyebrow">Personalization review</span><h2>{viewingOrder.order_number}</h2></div><button type="button" onClick={() => setViewingOrder(null)}><X /></button></div><div className="modal-scroll order-review-scroll"><div className="order-review-meta"><div><small>Customer</small><strong>{viewingOrder.name}</strong><span>{viewingOrder.email} · {viewingOrder.phone}</span></div><div><small>Delivery</small><strong>{viewingOrder.city}, {viewingOrder.state}</strong><span>{viewingOrder.address} · {viewingOrder.pincode}</span></div><div><small>Payment</small><strong>{viewingOrder.payment_method.toUpperCase()} · {viewingOrder.payment_status}</strong><span>₹{Number(viewingOrder.total_amount).toLocaleString('en-IN')}</span></div></div><div className="admin-personalization-list">{viewingOrder.items.map((item) => <article className="admin-personalization-item" key={item.id}><img className="admin-product-thumb" src={resolveImageUrl(item.product_image_url)} alt={item.product_title} /><div className="admin-personalization-copy"><h3>{item.product_title}</h3><p>Qty {item.quantity} · ₹{Number(item.unit_price).toLocaleString('en-IN')} each</p><div className="personalization-fields">{item.occasion && <span><small>Occasion</small>{item.occasion}</span>}{item.custom_text && <span><small>Message</small>{item.custom_text}</span>}{item.event_date && <span><small>Special date</small>{item.event_date}</span>}{!item.occasion && !item.custom_text && !item.event_date && !item.custom_image_url && <span><small>Personalization</small>None</span>}</div></div>{item.custom_image_url && <div className="admin-custom-photo"><small>Customer photo</small><CustomizationImage orderId={viewingOrder.id} itemId={item.id} reference={item.custom_image_url} alt={`Customization for ${item.product_title}`} /></div>}</article>)}</div></div><div className="modal-actions"><select className="status-select" value={viewingOrder.order_status} onChange={async (e) => { const updated = await updateStatus(viewingOrder.id, e.target.value); if (updated) setViewingOrder(updated) }}>{statuses.map((status) => <option key={status}>{status}</option>)}</select><button type="button" className="button button-ghost" onClick={() => setViewingOrder(null)}>Close</button></div></div></div>}
  {showForm && <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setShowForm(false)}><form className="product-modal" onSubmit={saveProduct}><div className="modal-head"><div><span className="eyebrow">Catalog manager</span><h2>{editing ? 'Edit product' : 'Add new product'}</h2></div><button type="button" onClick={() => setShowForm(false)}><X /></button></div><div className="modal-scroll"><div className="form-grid two"><label>Product title<input required value={form.title} onChange={(e) => field('title', e.target.value)} /></label><label>Category<input required value={form.category} onChange={(e) => field('category', e.target.value)} /></label></div><div className="form-grid three"><label>Price (₹)<input type="number" min="1" step="0.01" required value={form.price} onChange={(e) => field('price', e.target.value)} /></label><label>Stock<input type="number" min="0" required value={form.stock} onChange={(e) => field('stock', e.target.value)} /></label><label>Rating<input type="number" min="0" max="5" step="0.1" value={form.rating} onChange={(e) => field('rating', e.target.value)} /></label></div><label>Description<textarea rows="4" required value={form.description} onChange={(e) => field('description', e.target.value)} /></label><div className="form-grid two"><label>Material<input value={form.material || ''} onChange={(e) => field('material', e.target.value)} /></label><label>Delivery time<input value={form.delivery_time || ''} onChange={(e) => field('delivery_time', e.target.value)} /></label></div><label className="admin-upload"><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => uploadImage(e.target.files?.[0])} /><ImagePlus /> <span>{form.image_url ? 'Replace product image' : 'Upload product image'}</span></label>{form.image_url && <img className="modal-image-preview" src={resolveImageUrl(form.image_url)} alt="Preview" />}<div className="switch-grid"><Switch label="Customizable" checked={form.customizable} onChange={(v) => field('customizable', v)} /><Switch label="Requires photo" checked={form.needs_image} onChange={(v) => field('needs_image', v)} /><Switch label="Requires text" checked={form.needs_text} onChange={(v) => field('needs_text', v)} /><Switch label="Requires date" checked={form.needs_date} onChange={(v) => field('needs_date', v)} /><Switch label="Featured" checked={form.is_featured} onChange={(v) => field('is_featured', v)} /></div><div className="form-grid two"><label>Max text length<input type="number" min="1" max="1000" value={form.max_text_length} onChange={(e) => field('max_text_length', e.target.value)} /></label><label>Discount %<input type="number" min="0" max="90" value={form.discount_percent} onChange={(e) => field('discount_percent', e.target.value)} /></label></div></div><div className="modal-actions"><button type="button" className="button button-ghost" onClick={() => setShowForm(false)}>Cancel</button><button className="button" disabled={busy}><Save size={16} /> {busy ? 'Saving...' : 'Save product'}</button></div></form></div>}
  </div>
}

function Stat({ icon, label, value }) { return <article className="stat-card"><span>{icon}</span><div><small>{label}</small><strong>{value}</strong></div></article> }
function Switch({ label, checked, onChange }) { return <label className="switch-row"><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} /><span>{label}</span></label> }
