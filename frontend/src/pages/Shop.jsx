import { ChevronLeft, ChevronRight, RotateCcw, Search, SlidersHorizontal, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useSearchParams } from 'react-router-dom'
import ProductCard from '../components/ProductCard'
import api, { getErrorMessage } from '../services/api'

export default function Shop() {
  const [params, setParams] = useSearchParams()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)

  // Current query parameters from URL
  const searchParam = params.get('search') || ''
  const categoryParam = params.get('category') || 'all'
  const minPriceParam = params.get('min_price') || ''
  const maxPriceParam = params.get('max_price') || ''
  const sortByParam = params.get('sort_by') || 'featured'
  const inStockParam = params.get('in_stock') === 'true'
  const pageParam = parseInt(params.get('page') || '1', 10)

  // Controlled input states for immediate typing
  const [searchInput, setSearchInput] = useState(searchParam)
  const [minPriceInput, setMinPriceInput] = useState(minPriceParam)
  const [maxPriceInput, setMaxPriceInput] = useState(maxPriceParam)

  // Sync state if URL changes externally
  useEffect(() => {
    setSearchInput(searchParam)
    setMinPriceInput(minPriceParam)
    setMaxPriceInput(maxPriceParam)
  }, [searchParam, minPriceParam, maxPriceParam])

  // Load categories once
  useEffect(() => {
    api.get('/products/categories')
      .then(({ data }) => setCategories(data))
      .catch(() => {})
  }, [])

  // Fetch products on query parameters change
  useEffect(() => {
    setLoading(true)
    const query = new URLSearchParams()
    query.set('page_size', '12')
    query.set('page', String(pageParam))

    if (searchParam) query.set('search', searchParam)
    if (categoryParam !== 'all') query.set('category', categoryParam)
    if (minPriceParam) query.set('min_price', minPriceParam)
    if (maxPriceParam) query.set('max_price', maxPriceParam)
    if (sortByParam && sortByParam !== 'featured') query.set('sort_by', sortByParam)
    if (inStockParam) query.set('in_stock', 'true')

    api.get(`/products?${query.toString()}`)
      .then(({ data }) => {
        setProducts(data.items)
        setTotal(data.total)
        setPages(data.pages)
      })
      .catch((error) => {
        toast.error(getErrorMessage(error))
        setProducts([])
        setTotal(0)
        setPages(1)
      })
      .finally(() => setLoading(false))
  }, [searchParam, categoryParam, minPriceParam, maxPriceParam, sortByParam, inStockParam, pageParam])

  const updateParam = (key, value) => {
    const next = new URLSearchParams(params)
    if (value === null || value === undefined || value === '' || value === 'all' || (key === 'in_stock' && !value)) {
      next.delete(key)
    } else {
      next.set(key, String(value))
    }
    // Always reset to page 1 when modifying filters
    if (key !== 'page') {
      next.delete('page')
    }
    setParams(next)
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    updateParam('search', searchInput.trim())
  }

  const handlePriceApply = () => {
    const next = new URLSearchParams(params)
    if (minPriceInput.trim()) next.set('min_price', minPriceInput.trim()); else next.delete('min_price')
    if (maxPriceInput.trim()) next.set('max_price', maxPriceInput.trim()); else next.delete('max_price')
    next.delete('page')
    setParams(next)
  }

  const resetAllFilters = () => {
    setSearchInput('')
    setMinPriceInput('')
    setMaxPriceInput('')
    setParams({})
  }

  const hasActiveFilters = Boolean(
    searchParam || (categoryParam !== 'all') || minPriceParam || maxPriceParam || (sortByParam !== 'featured') || inStockParam || (pageParam > 1)
  )

  const goToPage = (p) => {
    const validPage = Math.max(1, Math.min(pages, p))
    updateParam('page', validPage)
    window.scrollTo({ top: 300, behavior: 'smooth' })
  }

  return (
    <div className="page-section">
      <div className="container">
        <div className="page-hero compact">
          <span className="eyebrow"><Sparkles size={14} /> Curated collection</span>
          <h1>Find a gift worth remembering</h1>
          <p>Personalize photos, messages and special dates across our collection.</p>
        </div>

        {/* Search and Main Toolbar */}
        <div className="shop-toolbar">
          <form className="search-box" onSubmit={handleSearchSubmit}>
            <Search size={19} />
            <input
              maxLength={100}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search gifts, categories, materials..."
            />
            <button type="submit">Search</button>
          </form>
          <div className="filter-title">
            <SlidersHorizontal size={18} /> Filters
          </div>
        </div>

        {/* Category Pills */}
        <div className="category-tabs">
          <button
            className={categoryParam === 'all' ? 'active' : ''}
            onClick={() => updateParam('category', 'all')}
          >
            All gifts
          </button>
          {categories.map((item) => (
            <button
              key={item}
              className={categoryParam === item ? 'active' : ''}
              onClick={() => updateParam('category', item)}
            >
              {item}
            </button>
          ))}
        </div>

        {/* Detailed Filters & Sorting Bar */}
        <div className="shop-filters-row">
          <div className="shop-filters-left">
            <div className="price-inputs">
              <span>Price:</span>
              <input
                type="number"
                min="0"
                placeholder="Min ₹"
                value={minPriceInput}
                onChange={(e) => setMinPriceInput(e.target.value)}
                onBlur={handlePriceApply}
                onKeyDown={(e) => e.key === 'Enter' && handlePriceApply()}
              />
              <span>–</span>
              <input
                type="number"
                min="0"
                placeholder="Max ₹"
                value={maxPriceInput}
                onChange={(e) => setMaxPriceInput(e.target.value)}
                onBlur={handlePriceApply}
                onKeyDown={(e) => e.key === 'Enter' && handlePriceApply()}
              />
            </div>

            <label className="in-stock-label">
              <input
                type="checkbox"
                checked={inStockParam}
                onChange={(e) => updateParam('in_stock', e.target.checked)}
              />
              <span>In stock only</span>
            </label>
          </div>

          <div className="shop-filters-right">
            <select
              className="sort-dropdown"
              value={sortByParam}
              onChange={(e) => updateParam('sort_by', e.target.value)}
            >
              <option value="featured">Sort: Featured</option>
              <option value="newest">Sort: Newest First</option>
              <option value="price_asc">Sort: Price: Low to High</option>
              <option value="price_desc">Sort: Price: High to Low</option>
              <option value="rating">Sort: Highest Rated</option>
            </select>

            {hasActiveFilters && (
              <button
                type="button"
                className="reset-btn"
                onClick={resetAllFilters}
                title="Reset all filters"
              >
                <RotateCcw size={14} /> Clear
              </button>
            )}
          </div>
        </div>

        {/* Results Meta info */}
        <div className="results-meta">
          <span>
            {loading ? 'Searching...' : `Showing ${products.length} of ${total} gift${total === 1 ? '' : 's'}`}
          </span>
          {categoryParam !== 'all' && <span>Category: <strong>{categoryParam}</strong></span>}
        </div>

        {/* Product Grid or Empty State */}
        {loading ? (
          <div className="page-loader"><span className="spinner" /></div>
        ) : products.length > 0 ? (
          <>
            <div className="product-grid">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {/* Pagination Controls */}
            {pages > 1 && (
              <nav className="pagination-wrap" aria-label="Pagination">
                <button
                  disabled={pageParam <= 1}
                  onClick={() => goToPage(pageParam - 1)}
                  aria-label="Previous page"
                >
                  <ChevronLeft size={16} /> Prev
                </button>

                {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    className={p === pageParam ? 'active' : ''}
                    onClick={() => goToPage(p)}
                  >
                    {p}
                  </button>
                ))}

                <button
                  disabled={pageParam >= pages}
                  onClick={() => goToPage(pageParam + 1)}
                  aria-label="Next page"
                >
                  Next <ChevronRight size={16} />
                </button>
                <div className="pagination-info">
                  Page {pageParam} of {pages}
                </div>
              </nav>
            )}
          </>
        ) : (
          <div className="no-results">
            <h3>No gifts found</h3>
            <p>Try adjusting your search query, price range, or category filter.</p>
            {hasActiveFilters && (
              <button
                className="button button-sm"
                style={{ marginTop: '16px' }}
                onClick={resetAllFilters}
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
