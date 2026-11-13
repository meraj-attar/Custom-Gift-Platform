import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  RotateCcw,
  Search,
  Sparkles,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { useSearchParams } from 'react-router-dom'
import ProductCard from '../components/ProductCard'
import api, { getErrorMessage } from '../services/api'

export default function Shop() {
  const [params, setParams] = useSearchParams()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)

  // Current query parameters from URL
  const searchParam = params.get('search') || ''
  const categoryParam = params.get('category') || 'all'
  const minPriceParam = params.get('min_price') || ''
  const maxPriceParam = params.get('max_price') || ''
  const sortByParam = params.get('sort_by') || 'featured'
  const inStockParam = params.get('in_stock') === 'true'
  const customizableParam = params.get('customizable') === 'true'
  const discountedParam = params.get('discounted') === 'true'
  const pageParam = parseInt(params.get('page') || '1', 10)

  // Controlled input states for immediate typing
  const [searchInput, setSearchInput] = useState(searchParam)
  const [minPriceInput, setMinPriceInput] = useState(minPriceParam)
  const [maxPriceInput, setMaxPriceInput] = useState(maxPriceParam)

  // Sync state if URL changes externally (e.g., browser back/forward or direct link)
  useEffect(() => {
    setSearchInput(searchParam)
    setMinPriceInput(minPriceParam)
    setMaxPriceInput(maxPriceParam)
  }, [searchParam, minPriceParam, maxPriceParam])

  // Load distinct categories once
  useEffect(() => {
    api
      .get('/products/categories')
      .then(({ data }) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

  // Deduplicate and normalize categories list
  const uniqueCategories = useMemo(() => {
    const seen = new Map()
    for (const cat of categories) {
      if (!cat) continue
      const trimmed = cat.trim()
      const key = trimmed.toLowerCase()
      if (!seen.has(key)) {
        seen.set(key, trimmed)
      }
    }
    return Array.from(seen.values())
  }, [categories])

  // Fetch products on query parameters change
  const fetchProducts = useCallback(async () => {
    setLoading(true)
    setError(null)
    const query = new URLSearchParams()
    query.set('page_size', '12')
    query.set('page', String(pageParam))

    if (searchParam) query.set('search', searchParam)
    if (categoryParam !== 'all') query.set('category', categoryParam)
    if (minPriceParam) query.set('min_price', minPriceParam)
    if (maxPriceParam) query.set('max_price', maxPriceParam)
    if (sortByParam && sortByParam !== 'featured') query.set('sort_by', sortByParam)
    if (inStockParam) query.set('in_stock', 'true')
    if (customizableParam) query.set('customizable', 'true')
    if (discountedParam) query.set('discounted', 'true')

    try {
      const { data } = await api.get(`/products?${query.toString()}`)
      setProducts(data.items || [])
      setTotal(data.total || 0)
      setPages(data.pages || 1)
    } catch (err) {
      setError(getErrorMessage(err))
      setProducts([])
      setTotal(0)
      setPages(1)
    } finally {
      setLoading(false)
    }
  }, [
    searchParam,
    categoryParam,
    minPriceParam,
    maxPriceParam,
    sortByParam,
    inStockParam,
    customizableParam,
    discountedParam,
    pageParam,
  ])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const updateParam = (key, value) => {
    const next = new URLSearchParams(params)
    if (
      value === null ||
      value === undefined ||
      value === '' ||
      value === 'all' ||
      ((key === 'in_stock' || key === 'customizable' || key === 'discounted') && !value)
    ) {
      next.delete(key)
    } else {
      next.set(key, String(value))
    }
    // Always reset to page 1 when modifying search or filters
    if (key !== 'page') {
      next.delete('page')
    }
    setParams(next)
  }

  // Search bar UI states & suggestion dropdown
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const searchWrapperRef = useRef(null)
  const searchInputRef = useRef(null)

  const popularKeywords = useMemo(
    () => [
      'Personalized Acrylic Keychain',
      'Photo Frame',
      'Wedding Hamper',
      'Custom Mug',
      'Moon Phase Lamp',
      'Wooden Keepsake Box',
    ],
    [],
  )

  const suggestions = useMemo(() => {
    const q = searchInput.trim().toLowerCase()
    const list = []

    if (!q) {
      return popularKeywords.slice(0, 5).map((kw) => ({ type: 'Popular', text: kw }))
    }

    for (const cat of uniqueCategories) {
      if (cat.toLowerCase().includes(q)) {
        list.push({ type: 'Category', text: cat })
      }
    }

    for (const kw of popularKeywords) {
      if (kw.toLowerCase().includes(q) && !list.some((item) => item.text.toLowerCase() === kw.toLowerCase())) {
        list.push({ type: 'Popular', text: kw })
      }
    }

    for (const p of products) {
      if (p.name && p.name.toLowerCase().includes(q) && !list.some((item) => item.text.toLowerCase() === p.name.toLowerCase())) {
        list.push({ type: 'Product', text: p.name })
      }
      if (list.length >= 6) break
    }

    return list.slice(0, 6)
  }, [searchInput, uniqueCategories, popularKeywords, products])

  // Close suggestions on outside click
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(event.target)) {
        setShowSuggestions(false)
        setHighlightedIndex(-1)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  const handleSearchKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      if (!showSuggestions) {
        setShowSuggestions(true)
        return
      }
      e.preventDefault()
      setHighlightedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      if (!showSuggestions) return
      e.preventDefault()
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1))
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
      setHighlightedIndex(-1)
    } else if (e.key === 'Enter') {
      if (showSuggestions && highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        e.preventDefault()
        handleSelectSuggestion(suggestions[highlightedIndex].text)
      }
    }
  }

  const handleSelectSuggestion = (text) => {
    setSearchInput(text)
    setShowSuggestions(false)
    setHighlightedIndex(-1)
    updateParam('search', text)
  }

  // Debounced search typing handler
  useEffect(() => {
    const trimmed = searchInput.trim()
    if (trimmed === searchParam) return
    const debounceTimer = setTimeout(() => {
      updateParam('search', trimmed)
    }, 400)
    return () => clearTimeout(debounceTimer)
  }, [searchInput])

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault()
    setShowSuggestions(false)
    setHighlightedIndex(-1)
    const trimmed = searchInput.trim()
    if (!trimmed && !searchParam) return
    updateParam('search', trimmed)
  }

  const handleClearSearch = () => {
    setSearchInput('')
    setShowSuggestions(false)
    setHighlightedIndex(-1)
    updateParam('search', '')
    searchInputRef.current?.focus()
  }

  const handlePriceApply = () => {
    const minVal = minPriceInput.trim() ? Number(minPriceInput.trim()) : null
    const maxVal = maxPriceInput.trim() ? Number(maxPriceInput.trim()) : null

    if (minVal !== null && minVal < 0) {
      toast.error('Minimum price cannot be negative')
      return
    }
    if (maxVal !== null && maxVal < 0) {
      toast.error('Maximum price cannot be negative')
      return
    }
    if (minVal !== null && maxVal !== null && minVal > maxVal) {
      toast.error('Minimum price cannot be greater than maximum price')
      return
    }

    const next = new URLSearchParams(params)
    if (minVal !== null) next.set('min_price', String(minVal))
    else next.delete('min_price')
    if (maxVal !== null) next.set('max_price', String(maxVal))
    else next.delete('max_price')
    next.delete('page')
    setParams(next)
  }

  const resetAllFilters = () => {
    setSearchInput('')
    setMinPriceInput('')
    setMaxPriceInput('')
    setParams({})
  }

  const isCategoryActive = (cat) => {
    if (cat === 'all') return !categoryParam || categoryParam.toLowerCase() === 'all'
    return categoryParam.trim().toLowerCase() === cat.trim().toLowerCase()
  }

  const hasActiveFilters = Boolean(
    searchParam ||
      (categoryParam !== 'all' && categoryParam !== '') ||
      minPriceParam ||
      maxPriceParam ||
      sortByParam !== 'featured' ||
      inStockParam ||
      customizableParam ||
      discountedParam ||
      pageParam > 1,
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
          <span className="eyebrow">
            <Sparkles size={14} /> Curated collection
          </span>
          <h1>Find a gift worth remembering</h1>
          <p>Personalize photos, messages and special dates across our collection.</p>
        </div>

        {/* Premium Search Bar Toolbar */}
        <div className="shop-toolbar">
          <div className="shop-search-wrapper" ref={searchWrapperRef}>
            <form
              className={`shop-search-bar search-box ${isSearchFocused ? 'focused' : ''}`}
              onSubmit={handleSearchSubmit}
              role="search"
            >
              <Search size={20} className="search-icon" aria-hidden="true" />
              <input
                ref={searchInputRef}
                type="text"
                maxLength={100}
                value={searchInput}
                onFocus={() => {
                  setIsSearchFocused(true)
                  setShowSuggestions(true)
                }}
                onBlur={() => setIsSearchFocused(false)}
                onChange={(e) => {
                  setSearchInput(e.target.value)
                  setShowSuggestions(true)
                }}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search gifts, categories, or something special..."
                aria-label="Search gifts, categories, or something special"
                autoComplete="off"
              />
              {searchInput && (
                <button
                  type="button"
                  className="search-clear-btn"
                  onClick={handleClearSearch}
                  aria-label="Clear search input"
                  title="Clear search"
                >
                  <X size={16} />
                </button>
              )}
              <button
                type="submit"
                className="search-submit-btn"
                disabled={loading}
                aria-label={loading ? 'Searching gifts' : 'Search gifts'}
              >
                {loading ? (
                  <>
                    <RefreshCw size={15} className="spin-icon" />
                    <span className="search-btn-text">Searching...</span>
                  </>
                ) : (
                  <span className="search-btn-text">Search</span>
                )}
              </button>
            </form>

            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="search-suggestions-dropdown" role="listbox" aria-label="Search suggestions">
                <div className="suggestions-header">
                  {searchInput.trim() ? 'Matching Suggestions' : 'Popular Searches'}
                </div>
                {suggestions.map((item, idx) => (
                  <div
                    key={idx}
                    className={`suggestion-item ${highlightedIndex === idx ? 'highlighted' : ''}`}
                    onMouseDown={() => handleSelectSuggestion(item.text)}
                    role="option"
                    aria-selected={highlightedIndex === idx}
                  >
                    <span className="suggestion-type-badge">{item.type}</span>
                    <span className="suggestion-text">{item.text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Deduplicated Category Chips */}
        <div className="category-tabs" role="tablist" aria-label="Gift Categories">
          <button
            type="button"
            className={isCategoryActive('all') ? 'active' : ''}
            onClick={() => updateParam('category', 'all')}
            aria-pressed={isCategoryActive('all')}
          >
            All gifts
          </button>
          {uniqueCategories.map((item) => (
            <button
              type="button"
              key={item}
              className={isCategoryActive(item) ? 'active' : ''}
              onClick={() => updateParam('category', item)}
              aria-pressed={isCategoryActive(item)}
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
                aria-label="Minimum price in Rupees"
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
                aria-label="Maximum price in Rupees"
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

            <label className="in-stock-label">
              <input
                type="checkbox"
                checked={discountedParam}
                onChange={(e) => updateParam('discounted', e.target.checked)}
              />
              <span>On sale</span>
            </label>
          </div>

          <div className="shop-filters-right">
            <select
              className="sort-dropdown"
              value={sortByParam}
              onChange={(e) => updateParam('sort_by', e.target.value)}
              aria-label="Sort products by"
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
                aria-label="Reset all filters"
              >
                <RotateCcw size={14} /> Clear
              </button>
            )}
          </div>
        </div>

        {/* Results Meta info */}
        <div className="results-meta">
          <span>
            {loading
              ? 'Searching...'
              : `Showing ${products.length} of ${total} gift${total === 1 ? '' : 's'}`}
          </span>
          {categoryParam !== 'all' && (
            <span>
              Category: <strong>{categoryParam}</strong>
            </span>
          )}
        </div>

        {/* Product Grid, Loading Skeleton, Error, or Empty State */}
        {loading ? (
          <div className="product-grid" data-testid="shop-loading" aria-busy="true">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <div key={n} className="product-card skeleton-card" aria-hidden="true">
                <div className="skeleton-image-wrap shimmer" />
                <div className="product-card-body">
                  <div className="skeleton-line shimmer short" />
                  <div className="skeleton-line shimmer title" />
                  <div className="skeleton-footer">
                    <div className="skeleton-line shimmer price" />
                    <div className="skeleton-circle shimmer" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="home-status-card error-card" role="alert">
            <AlertCircle className="status-icon" size={32} />
            <div>
              <h4>Unable to load gifts</h4>
              <p>{error}</p>
            </div>
            <button
              type="button"
              className="button button-sm"
              onClick={fetchProducts}
            >
              <RefreshCw size={14} /> Retry
            </button>
          </div>
        ) : products.length > 0 ? (
          <>
            <div className="product-grid" data-testid="shop-products-grid">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {/* Pagination Controls */}
            {pages > 1 && (
              <nav className="pagination-wrap" aria-label="Pagination">
                <button
                  type="button"
                  disabled={pageParam <= 1}
                  onClick={() => goToPage(pageParam - 1)}
                  aria-label="Previous page"
                >
                  <ChevronLeft size={16} /> Prev
                </button>

                {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                  <button
                    type="button"
                    key={p}
                    className={p === pageParam ? 'active' : ''}
                    onClick={() => goToPage(p)}
                  >
                    {p}
                  </button>
                ))}

                <button
                  type="button"
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
          <div className="no-results" role="status">
            <h3>{searchParam ? `No gifts found for "${searchParam}"` : 'No gifts found'}</h3>
            <p>
              {searchParam
                ? `We couldn't find any products matching "${searchParam}". Try checking your spelling, using broader keywords, or exploring our categories below.`
                : categoryParam !== 'all'
                ? `No products found matching category "${categoryParam}". Try exploring other categories or clearing your active filters.`
                : 'Try adjusting your search query, price range, or category filter.'}
            </p>
            <div
              style={{
                display: 'flex',
                gap: '10px',
                justifyContent: 'center',
                marginTop: '18px',
                flexWrap: 'wrap',
              }}
            >
              {searchParam && (
                <button
                  type="button"
                  className="button button-sm"
                  onClick={handleClearSearch}
                >
                  <X size={14} /> Clear search
                </button>
              )}
              {hasActiveFilters && (
                <button
                  type="button"
                  className="button button-secondary button-sm"
                  onClick={resetAllFilters}
                >
                  <RotateCcw size={14} /> Reset all filters
                </button>
              )}
              <button
                type="button"
                className="button button-outline button-sm"
                onClick={() => {
                  setSearchInput('')
                  updateParam('category', 'all')
                  updateParam('search', '')
                }}
              >
                Browse all gifts
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
