import { Link } from 'react-router-dom'

export default function NotFound() {
  return <div className="not-found"><span>404</span><h1>This gift got lost in transit.</h1><p>The page you’re looking for doesn’t exist.</p><Link className="button" to="/">Back home</Link></div>
}
