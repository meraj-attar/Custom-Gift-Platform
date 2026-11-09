import { Search, SlidersHorizontal } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import ProductCard from '../components/ProductCard'
import api from '../services/api'

export default function Shop() {
  const [params, setParams] = useSearchParams()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState(params.get('search') || '')
  const category = params.get('category') || 'all'

  useEffect(() => { api.get('/products/categories').then(({ data }) => setCategories(data)).catch(() => {}) }, [])
  useEffect(() => {
    setLoading(true)
    const query = new URLSearchParams({ page_size: '50' })
    if (params.get('search')) query.set('search', params.get('search'))
    if (category !== 'all') query.set('category', category)
    api.get(`/products?${query}`).then(({ data }) => setProducts(data.items)).finally(() => setLoading(false))
  }, [params, category])

  const submit = (e) => {
    e.preventDefault()
    const next = new URLSearchParams(params)
    if (search.trim()) next.set('search', search.trim()); else next.delete('search')
    setParams(next)
  }

  const chooseCategory = (value) => {
    const next = new URLSearchParams(params)
    if (value === 'all') next.delete('category'); else next.set('category', value)
    setParams(next)
  }

  return <div className="page-section">
    <div className="container">
      <div className="page-hero compact"><span className="eyebrow">Curated collection</span><h1>Find a gift worth remembering</h1><p>Personalize photos, messages and special dates across our collection.</p></div>
      <div className="shop-toolbar">
        <form className="search-box" onSubmit={submit}><Search size={19} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search gifts, categories..." /><button>Search</button></form>
        <div className="filter-title"><SlidersHorizontal size={18} /> Filters</div>
      </div>
      <div className="category-tabs"><button className={category === 'all' ? 'active' : ''} onClick={() => chooseCategory('all')}>All gifts</button>{categories.map((item) => <button key={item} className={category === item ? 'active' : ''} onClick={() => chooseCategory(item)}>{item}</button>)}</div>
      {loading ? <div className="page-loader"><span className="spinner" /></div> : products.length ? <div className="product-grid">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <div className="no-results"><h3>No gifts found</h3><p>Try another search or category.</p></div>}
    </div>
  </div>
}
