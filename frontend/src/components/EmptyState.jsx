import { Gift } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function EmptyState({ title, text, action = 'Browse gifts', to = '/shop' }) {
  return <div className="empty-state"><span className="empty-icon"><Gift /></span><h2>{title}</h2><p>{text}</p><Link className="button" to={to}>{action}</Link></div>
}
