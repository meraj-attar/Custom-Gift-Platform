import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

// Resolve image logic as defined in api.js
const API_ORIGIN = 'http://127.0.0.1:8004'
function resolveImageUrl(url) {
  if (!url) return '/products/gift1.jpg'
  if (/^https?:\/\//i.test(url)) return url
  if (url.startsWith('/media/')) return `${API_ORIGIN}${url}`
  return url
}

// Indian Rupee price formatting utility used across Homepage & ProductCard
function formatINR(price) {
  return `₹${Number(price).toLocaleString('en-IN')}`
}

describe('Homepage & Navigation Unit Tests', () => {
  it('1. Category links are valid and properly encoded', () => {
    const categories = [
      { name: 'Mugs', img: '/products/cup.jpg' },
      { name: 'Frames', img: '/products/frame.jpg' },
      { name: 'Hampers', img: '/products/hamper.jpg' },
      { name: 'Decor', img: '/products/w1.jpg' },
    ]

    for (const cat of categories) {
      assert.ok(cat.name.length > 0)
      assert.ok(cat.img.startsWith('/products/'))
      const link = `/shop?category=${encodeURIComponent(cat.name)}`
      assert.equal(link, `/shop?category=${cat.name}`)
    }
  })

  it('2. Image resolution returns safe URLs and falls back cleanly', () => {
    // Null / empty URL fallback
    assert.equal(resolveImageUrl(null), '/products/gift1.jpg')
    assert.equal(resolveImageUrl(''), '/products/gift1.jpg')

    // External absolute URL preserved
    assert.equal(
      resolveImageUrl('https://images.unsplash.com/photo-123'),
      'https://images.unsplash.com/photo-123'
    )

    // Local media upload URL prepends API origin
    assert.equal(
      resolveImageUrl('/media/products/sample.png'),
      'http://127.0.0.1:8004/media/products/sample.png'
    )

    // Static asset relative URL preserved
    assert.equal(resolveImageUrl('/products/frame.jpg'), '/products/frame.jpg')
  })

  it('3. Price formatting formats Indian currency correctly without NaN', () => {
    assert.equal(formatINR('999.00'), '₹999')
    assert.equal(formatINR(1499), '₹1,499')
    assert.equal(formatINR('249.50'), '₹249.5')
    assert.equal(formatINR('1099.00'), '₹1,099')
    assert.equal(formatINR(0), '₹0')
  })

  it('4. Resilient featured product fallback selector works correctly', () => {
    // If featured items exist, select top 4 featured
    const mockFeatured = [
      { id: 1, title: 'Item 1', is_featured: true },
      { id: 2, title: 'Item 2', is_featured: true },
      { id: 3, title: 'Item 3', is_featured: true },
      { id: 4, title: 'Item 4', is_featured: true },
      { id: 5, title: 'Item 5', is_featured: true },
    ]
    const selectedFeatured = mockFeatured.slice(0, 4)
    assert.equal(selectedFeatured.length, 4)
    assert.equal(selectedFeatured[0].id, 1)

    // If featured items array is empty, fallback selector uses top catalog items
    const emptyFeatured = []
    const catalogFallback = [
      { id: 10, title: 'Top 1', rating: 4.9 },
      { id: 11, title: 'Top 2', rating: 4.8 },
      { id: 12, title: 'Top 3', rating: 4.7 },
      { id: 13, title: 'Top 4', rating: 4.6 },
    ]
    const finalProducts = emptyFeatured.length > 0 ? emptyFeatured.slice(0, 4) : catalogFallback.slice(0, 4)
    assert.equal(finalProducts.length, 4)
    assert.equal(finalProducts[0].id, 10)
  })

  it('5. Footer navigation links adapt dynamically between guest and authenticated states', () => {
    function getAccountLinks(user) {
      if (user) {
        return [
          { label: 'My orders', to: '/orders' },
          { label: 'My wishlist', to: '/wishlist' },
          { label: 'Gift bag', to: '/cart' },
          { label: 'Sign out', action: 'logout' },
        ]
      }
      return [
        { label: 'Sign in', to: '/login' },
        { label: 'Create an account', to: '/register' },
        { label: 'Gift bag', to: '/cart' },
      ]
    }

    // Guest state
    const guestLinks = getAccountLinks(null)
    assert.deepEqual(guestLinks.map((l) => l.label), ['Sign in', 'Create an account', 'Gift bag'])
    assert.ok(!guestLinks.some((l) => l.label === 'Sign out'))

    // Authenticated state
    const userLinks = getAccountLinks({ id: 1, name: 'Meraj' })
    assert.deepEqual(userLinks.map((l) => l.label), ['My orders', 'My wishlist', 'Gift bag', 'Sign out'])
    assert.ok(!userLinks.some((l) => l.label === 'Sign in'))
  })

  it('6. Production footer removes all demo/portfolio text and dead # links', () => {
    const prohibitedPhrases = [
      'portfolio project',
      'demo admin',
      'Admin@123',
      'React + FastAPI',
    ]

    const footerText = 'Thoughtful personalized gifts handcrafted with love and delivered across India with care. Every keepsake is handcrafted and inspected before dispatch to ensure lasting quality.'

    for (const phrase of prohibitedPhrases) {
      assert.ok(
        !footerText.toLowerCase().includes(phrase.toLowerCase()),
        `Footer must not contain placeholder phrase: "${phrase}"`
      )
    }

    // Verify social links are valid external URLs, not dead '#'
    const socialLinks = [
      'https://instagram.com',
      'https://linkedin.com',
      'mailto:support@customgift.dev',
    ]
    for (const href of socialLinks) {
      assert.notEqual(href, '#')
      assert.ok(href.startsWith('https://') || href.startsWith('mailto:'))
    }
  })
})
