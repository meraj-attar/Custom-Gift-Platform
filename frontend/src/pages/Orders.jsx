import { ArrowRight, CalendarDays, ReceiptText } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import EmptyState from '../components/EmptyState'
import api, { resolveImageUrl } from '../services/api'

export default function Orders() {
  const [orders, setOrders] = useState(null)
  useEffect(() => { api.get('/orders/me').then(({ data }) => setOrders(data)).catch(() => setOrders([])) }, [])
  if (orders === null) return <div className="page-loader"><span className="spinner" /></div>
  if (!orders.length) return <div className="page-section"><div className="container"><EmptyState title="No orders yet" text="Your personalized gifts and tracking updates will appear here." /></div></div>
  return <div className="page-section"><div className="container"><div className="page-hero compact align-left"><span className="eyebrow">Order history</span><h1>My orders</h1><p>Track your personalized gifts from confirmation to delivery.</p></div><div className="orders-list">{orders.map((order) => <article className="order-card" key={order.id}><div className="order-card-top"><div><span className="order-number"><ReceiptText size={16} /> {order.order_number}</span><span className="order-date"><CalendarDays size={15} /> {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span></div><span className={`status-badge status-${order.order_status.toLowerCase()}`}>{order.order_status.replaceAll('_', ' ')}</span></div><div className="order-preview">{order.items.slice(0,3).map((item) => <img key={item.id} src={resolveImageUrl(item.product_image_url)} alt={item.product_title} />)}<div><strong>{order.items.length} item{order.items.length > 1 ? 's' : ''}</strong><span>{order.payment_method.toUpperCase()} · {order.payment_status}</span></div><b>₹{Number(order.total_amount).toLocaleString('en-IN')}</b></div><Link className="order-link" to={`/orders/${order.id}`}>View order & tracking <ArrowRight size={16} /></Link></article>)}</div></div></div>
}
