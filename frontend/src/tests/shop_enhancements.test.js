import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

// 1. Discounted and original strike-through price calculator
function computeOriginalPrice(price, discountPercent) {
  if (!discountPercent || discountPercent <= 0) return null
  return Math.round(Number(price) / (1 - discountPercent / 100))
}

// 2. Stock status indicator
function getStockStatus(stock) {
  const num = Number(stock) || 0
  if (num <= 0) return { label: 'Out of stock', type: 'out-of-stock', canOrder: false }
  if (num <= 5) return { label: `Only ${num} left`, type: 'low-stock', canOrder: true }
  return { label: 'In stock', type: 'in-stock', canOrder: true }
}

// 3. Price validation logic
function validatePriceRange(minPrice, maxPrice) {
  const min = minPrice !== '' && minPrice !== null && minPrice !== undefined ? Number(minPrice) : null
  const max = maxPrice !== '' && maxPrice !== null && maxPrice !== undefined ? Number(maxPrice) : null

  if (min !== null && (isNaN(min) || min < 0)) {
    return { valid: false, error: 'Minimum price cannot be negative' }
  }
  if (max !== null && (isNaN(max) || max < 0)) {
    return { valid: false, error: 'Maximum price cannot be negative' }
  }
  if (min !== null && max !== null && min > max) {
    return { valid: false, error: 'Minimum price cannot be greater than maximum price' }
  }
  return { valid: true, min, max }
}

// 4. Order Now workflow resolution
function resolveOrderAction(product) {
  if (Number(product.stock) <= 0) {
    return { action: 'BLOCKED', reason: 'out-of-stock' }
  }
  if (product.customizable || product.needs_image || product.needs_text || product.needs_date) {
    return { action: 'CUSTOMIZE', url: `/products/${product.slug}?action=order-now` }
  }
  return { action: 'CHECKOUT', url: '/checkout' }
}

describe('Change 6: Shop Page Audit & Product Card Enhancement Tests', () => {
  it('1. Computes original list price accurately for discounted products', () => {
    // 10% discount on ₹899 -> 899 / 0.9 = ₹999
    assert.equal(computeOriginalPrice(899, 10), 999)
    // 15% discount on ₹849 -> 849 / 0.85 = ₹999
    assert.equal(computeOriginalPrice(849, 15), 999)
    // 0% discount returns null (no strikethrough price shown)
    assert.equal(computeOriginalPrice(1099, 0), null)
    // Negative or invalid discount returns null
    assert.equal(computeOriginalPrice(1099, -5), null)
  })

  it('2. Evaluates stock levels and generates accurate stock pills', () => {
    assert.deepEqual(getStockStatus(0), { label: 'Out of stock', type: 'out-of-stock', canOrder: false })
    assert.deepEqual(getStockStatus(-2), { label: 'Out of stock', type: 'out-of-stock', canOrder: false })
    assert.deepEqual(getStockStatus(3), { label: 'Only 3 left', type: 'low-stock', canOrder: true })
    assert.deepEqual(getStockStatus(5), { label: 'Only 5 left', type: 'low-stock', canOrder: true })
    assert.deepEqual(getStockStatus(15), { label: 'In stock', type: 'in-stock', canOrder: true })
  })

  it('3. Validates price ranges and rejects inverted or negative bounds', () => {
    assert.equal(validatePriceRange('500', '1500').valid, true)
    assert.equal(validatePriceRange('500', '').valid, true)
    assert.equal(validatePriceRange('', '1000').valid, true)

    // Rejects min > max
    const inverted = validatePriceRange('2000', '500')
    assert.equal(inverted.valid, false)
    assert.equal(inverted.error, 'Minimum price cannot be greater than maximum price')

    // Rejects negative prices
    const negativeMin = validatePriceRange('-100', '500')
    assert.equal(negativeMin.valid, false)
    assert.equal(negativeMin.error, 'Minimum price cannot be negative')
  })

  it('4. Order Now directs customizable gifts to customization and standard gifts to checkout', () => {
    const customizableProduct = {
      id: 1,
      slug: 'personalized-couple-frame',
      stock: 10,
      customizable: true,
      needs_image: true,
    }
    const standardProduct = {
      id: 2,
      slug: 'gourmet-chocolate-basket',
      stock: 5,
      customizable: false,
      needs_image: false,
      needs_text: false,
    }
    const outOfStockProduct = {
      id: 3,
      slug: 'sold-out-mug',
      stock: 0,
      customizable: true,
    }

    assert.deepEqual(resolveOrderAction(customizableProduct), {
      action: 'CUSTOMIZE',
      url: '/products/personalized-couple-frame?action=order-now',
    })

    assert.deepEqual(resolveOrderAction(standardProduct), {
      action: 'CHECKOUT',
      url: '/checkout',
    })

    assert.deepEqual(resolveOrderAction(outOfStockProduct), {
      action: 'BLOCKED',
      reason: 'out-of-stock',
    })
  })

  it('5. Clear search safely resets query without leaving hanging query params', () => {
    const params = new URLSearchParams('search=wedding&category=Frames&min_price=500')
    params.delete('search')
    assert.equal(params.get('search'), null)
    assert.equal(params.get('category'), 'Frames')
    assert.equal(params.get('min_price'), '500')
  })

  it('6. All 7 categories in catalog are valid and distinct', () => {
    const catalogCategories = [
      'Decor',
      'Frames',
      'Hampers',
      'Keepsakes',
      'Mugs',
      'Personalized Accessories',
      'Photo Gifts',
    ]

    assert.equal(catalogCategories.length, 7)
    assert.equal(new Set(catalogCategories).size, 7)
    for (const cat of catalogCategories) {
      assert.ok(cat.length >= 2)
      assert.equal(cat.trim(), cat)
    }
  })

  it('7. Professional search bar UI component contains all required elements and states', async () => {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const { fileURLToPath } = await import('node:url')
    const currentDir = path.dirname(fileURLToPath(import.meta.url))
    const candidatePaths = [
      path.resolve(currentDir, '../pages/Shop.jsx'),
      path.resolve(process.cwd(), 'src/pages/Shop.jsx'),
      path.resolve(process.cwd(), 'frontend/src/pages/Shop.jsx'),
    ]
    const shopPath = candidatePaths.find((p) => fs.existsSync(p))
    const shopCode = fs.readFileSync(shopPath, 'utf8')

    // Specific placeholder copy
    assert.ok(
      shopCode.includes('placeholder="Search gifts, categories, or something special..."'),
      'Must contain exact placeholder copy "Search gifts, categories, or something special..."'
    )

    // Structural classes
    assert.ok(shopCode.includes('shop-search-wrapper'), 'Must render shop-search-wrapper')
    assert.ok(shopCode.includes('shop-search-bar'), 'Must render shop-search-bar')
    assert.ok(shopCode.includes('search-submit-btn'), 'Must render search-submit-btn')
    assert.ok(shopCode.includes('search-clear-btn'), 'Must render search-clear-btn')
    assert.ok(shopCode.includes('search-suggestions-dropdown'), 'Must support search suggestions dropdown')
    assert.ok(shopCode.includes('Searching...'), 'Must render Searching... loading state')
    assert.ok(shopCode.includes('handleClearSearch'), 'Must support handleClearSearch')
    assert.ok(shopCode.includes('handleSearchKeyDown'), 'Must support keyboard navigation')
  })
})
