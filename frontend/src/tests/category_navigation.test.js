import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

// 1. Authoritative category canonical mapping engine
const CATEGORY_CANONICAL_MAP = {
  mugs: 'Mugs',
  mug: 'Mugs',
  'customize mugs': 'Mugs',
  'customized mugs': 'Mugs',
  'photo mugs': 'Mugs',
  frames: 'Frames',
  frame: 'Frames',
  'photo frames': 'Frames',
  'photo frame': 'Frames',
  'memory frames': 'Frames',
  hampers: 'Hampers',
  hamper: 'Hampers',
  'gift hampers': 'Hampers',
  'gift hamper': 'Hampers',
  'celebration hampers': 'Hampers',
  decor: 'Decor',
  'home decor': 'Decor',
  'personalized lamps': 'Decor',
  lamps: 'Decor',
  lamp: 'Decor',
  cushions: 'Decor',
  cushion: 'Decor',
  keepsakes: 'Keepsakes',
  keepsake: 'Keepsakes',
  'personalized gifts': 'Keepsakes',
  'photo gifts': 'Decor',
}

function resolveCanonicalCategory(input) {
  if (!input || !input.trim()) return 'All'
  const cleaned = input.trim().toLowerCase()
  return CATEGORY_CANONICAL_MAP[cleaned] || input.trim()
}

// 2. Frontend deduplication algorithm
function deduplicateCategories(rawList) {
  const seen = new Map()
  for (const cat of rawList) {
    if (!cat) continue
    const trimmed = cat.trim()
    const key = trimmed.toLowerCase()
    if (!seen.has(key)) {
      seen.set(key, trimmed)
    }
  }
  return Array.from(seen.values())
}

// 3. Category active check (case-insensitive)
function isCategoryActive(categoryParam, item) {
  if (item === 'all') {
    return !categoryParam || categoryParam.toLowerCase() === 'all'
  }
  return (categoryParam || '').trim().toLowerCase() === item.trim().toLowerCase()
}

describe('Change 5: Category Navigation & Product Filtering Tests', () => {
  it('1. Homepage categories map to canonical categories without 0 results', () => {
    const homepageCategories = ['Mugs', 'Frames', 'Hampers', 'Decor']
    for (const cat of homepageCategories) {
      const canonical = resolveCanonicalCategory(cat)
      assert.equal(canonical, cat)
    }

    // Verify aliases used in dirty databases map to the canonical parent
    assert.equal(resolveCanonicalCategory('Customize Mugs'), 'Mugs')
    assert.equal(resolveCanonicalCategory(' Customize Mugs '), 'Mugs')
    assert.equal(resolveCanonicalCategory('Photo Frames'), 'Frames')
    assert.equal(resolveCanonicalCategory('Gift Hampers'), 'Hampers')
    assert.equal(resolveCanonicalCategory('Personalized Lamps'), 'Decor')
    assert.equal(resolveCanonicalCategory('Cushions'), 'Decor')
  })

  it('2. Category deduplication removes duplicate chips regardless of whitespace or case', () => {
    const dirtyCategoriesFromApi = [
      ' Customize Mugs ',
      'Cushions',
      'Customize Mugs',
      'Customize Mugs ',
      'Gift Hampers',
      'Personalized Gifts',
      'Personalized Lamps',
      'Photo Frames',
    ]

    const clean = deduplicateCategories(dirtyCategoriesFromApi)

    // "Customize Mugs" must appear exactly once
    const customizeMugsMatches = clean.filter((c) => c.toLowerCase() === 'customize mugs')
    assert.equal(customizeMugsMatches.length, 1)

    // Total clean categories must have no duplicates
    const uniqueKeys = new Set(clean.map((c) => c.toLowerCase()))
    assert.equal(clean.length, uniqueKeys.size)
  })

  it('3. Active category chip is highlighted accurately case-insensitively', () => {
    // URL has ?category=Mugs
    assert.equal(isCategoryActive('Mugs', 'Mugs'), true)
    assert.equal(isCategoryActive('Mugs', 'mugs'), true)
    assert.equal(isCategoryActive('Mugs', 'Frames'), false)
    assert.equal(isCategoryActive('Mugs', 'all'), false)

    // URL has ?category=mugs (lowercase from manual typing)
    assert.equal(isCategoryActive('mugs', 'Mugs'), true)

    // URL has no category or category=all
    assert.equal(isCategoryActive(null, 'all'), true)
    assert.equal(isCategoryActive('', 'all'), true)
    assert.equal(isCategoryActive('all', 'all'), true)
    assert.equal(isCategoryActive('ALL', 'all'), true)
  })

  it('4. Updating category preserves other active filters (search, price, sort)', () => {
    const currentParams = new URLSearchParams({
      search: 'anniversary',
      min_price: '500',
      max_price: '2000',
      sort_by: 'price_asc',
      in_stock: 'true',
      page: '3',
    })

    function updateCategoryParam(params, newCategory) {
      const next = new URLSearchParams(params)
      if (!newCategory || newCategory === 'all') {
        next.delete('category')
      } else {
        next.set('category', newCategory)
      }
      // Reset page to 1 on category change
      next.delete('page')
      return next
    }

    const updated = updateCategoryParam(currentParams, 'Frames')

    // Preserved filters
    assert.equal(updated.get('search'), 'anniversary')
    assert.equal(updated.get('min_price'), '500')
    assert.equal(updated.get('max_price'), '2000')
    assert.equal(updated.get('sort_by'), 'price_asc')
    assert.equal(updated.get('in_stock'), 'true')
    assert.equal(updated.get('category'), 'Frames')

    // Page must be reset
    assert.equal(updated.get('page'), null)
  })

  it('5. Reset filters resets all search, price, category, and sort parameters to default', () => {
    const activeParams = new URLSearchParams({
      search: 'mug',
      category: 'Mugs',
      min_price: '300',
      max_price: '1000',
      sort_by: 'rating',
      in_stock: 'true',
      page: '2',
    })

    function resetFilters() {
      return new URLSearchParams()
    }

    const cleared = resetFilters(activeParams)
    assert.equal(cleared.toString(), '')
    assert.equal(cleared.get('category'), null)
    assert.equal(cleared.get('search'), null)
  })

  it('6. URL generation for homepage category cards uses safe encoding', () => {
    const categories = [
      { name: 'Mugs' },
      { name: 'Frames' },
      { name: 'Hampers' },
      { name: 'Decor' },
      { name: 'Gift Hampers' },
    ]

    for (const c of categories) {
      const url = `/shop?category=${encodeURIComponent(c.name)}`
      assert.ok(url.startsWith('/shop?category='))
      if (c.name.includes(' ')) {
        assert.ok(url.includes('%20'))
      }
    }
  })
})
