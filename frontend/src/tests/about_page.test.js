import assert from 'node:assert/strict'
import fs from 'node:fs'
import { describe, it } from 'node:test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

describe('Change 10: About Us Page Audit, Content & Architecture Tests', () => {
  const currentDir = path.dirname(fileURLToPath(import.meta.url))
  const candidatePaths = [
    path.resolve(currentDir, '../pages/About.jsx'),
    path.resolve(process.cwd(), 'frontend/src/pages/About.jsx'),
    path.resolve(process.cwd(), 'src/pages/About.jsx'),
  ]
  const aboutPath = candidatePaths.find((p) => fs.existsSync(p))
  const aboutCode = fs.readFileSync(aboutPath, 'utf8')

  it('1. Completely eliminates developer / portfolio buzzwords from the customer-facing About page', () => {
    const forbiddenWords = [
      'portfolio ready',
      'built to scale',
      'fastapi',
      'sqlalchemy',
      'alembic',
      'docker',
      'insecure prototype flow',
      'admin workflows',
    ]

    const lower = aboutCode.toLowerCase()
    forbiddenWords.forEach((word) => {
      assert.equal(
        lower.includes(word),
        false,
        `Customer-facing About page must not contain developer jargon: "${word}"`
      )
    })
  })

  it('2. Implements all 7 required sections with proper headings and semantic landmarks', () => {
    // 1. Hero / Our Story
    assert.ok(aboutCode.includes('about-hero-section'))
    assert.ok(aboutCode.includes('Our Story'))
    assert.ok(aboutCode.includes('Technology for gifts that still feel deeply human.'))

    // 2. Mission
    assert.ok(aboutCode.includes('about-mission-section'))
    assert.ok(aboutCode.includes('Our Mission'))
    assert.ok(aboutCode.includes('Turning everyday moments into keepsakes you can hold.'))

    // 3. What Makes CustomGift Different (Features)
    assert.ok(aboutCode.includes('about-features-section'))
    assert.ok(aboutCode.includes('Why CustomGift'))
    assert.ok(aboutCode.includes('Personalized Experiences'))
    assert.ok(aboutCode.includes('Simple Shopping Experience'))
    assert.ok(aboutCode.includes('Secure Shopping'))
    assert.ok(aboutCode.includes('Thoughtful Gift Collection'))

    // 4. How CustomGift Works (Workflow)
    assert.ok(aboutCode.includes('about-workflow-section'))
    assert.ok(aboutCode.includes('The Experience'))
    assert.ok(aboutCode.includes('01'))
    assert.ok(aboutCode.includes('02'))
    assert.ok(aboutCode.includes('03'))
    assert.ok(aboutCode.includes('04'))
    assert.ok(aboutCode.includes('Explore'))
    assert.ok(aboutCode.includes('Choose'))
    assert.ok(aboutCode.includes('Personalize'))
    assert.ok(aboutCode.includes('Order & Delight'))

    // 5. Collection Showcase
    assert.ok(aboutCode.includes('about-collection-section'))
    assert.ok(aboutCode.includes('Featured Keepsakes'))
    assert.ok(aboutCode.includes('ProductCard'))

    // 6. Commitment / Trust
    assert.ok(aboutCode.includes('about-commitment-section'))
    assert.ok(aboutCode.includes('Our Promise'))
    assert.ok(aboutCode.includes('Quality-Focused Gifting'))
    assert.ok(aboutCode.includes('Transparent Shopping Experience'))

    // 7. Final CTA
    assert.ok(aboutCode.includes('about-final-cta-section'))
    assert.ok(aboutCode.includes('Make Every Gift More Meaningful.'))
  })

  it('3. All CTA buttons link to valid application destinations', () => {
    // Explore the collection -> /shop
    assert.ok(aboutCode.includes('to="/shop"'))

    // Contact Us -> /contact
    assert.ok(aboutCode.includes('to="/contact"'))
  })

  it('4. Reuses the standard ProductCard component for genuine catalog consistency', () => {
    assert.ok(aboutCode.includes("import ProductCard from '../components/ProductCard'"))
    assert.ok(aboutCode.includes('<ProductCard product={item} key={item.id} />'))
  })

  it('5. Handles catalog API loading, fallback, and error states gracefully', () => {
    assert.ok(aboutCode.includes('skeleton-card'))
    assert.ok(aboutCode.includes('about-error-box'))
    assert.ok(aboutCode.includes('Retry Loading Gifts'))
  })

  it('6. All imagery has descriptive alt attributes for accessibility', () => {
    assert.ok(aboutCode.includes('alt="Handcrafted personalized photo frame with memory moments"'))
    assert.ok(aboutCode.includes('alt="Curated celebration gift hamper box"'))
    assert.ok(aboutCode.includes('alt="Personalized ceramic memory photo mug"'))
    assert.ok(aboutCode.includes('alt="Personalized family name wooden wall plaque on display"'))
  })

  it('7. Sets document title for SEO and user navigation', () => {
    assert.ok(aboutCode.includes("document.title = 'About Us — CustomGift"))
  })

  it('8. 4-step workflow accurately reflects the real customer journey', () => {
    const steps = [
      { num: '01', title: 'Explore' },
      { num: '02', title: 'Choose' },
      { num: '03', title: 'Personalize' },
      { num: '04', title: 'Order & Delight' },
    ]
    steps.forEach((step) => {
      assert.ok(aboutCode.includes(step.num))
      assert.ok(aboutCode.includes(step.title))
    })
  })

  it('9. Uses standard responsive product-grid class and never unstyled products-grid class', () => {
    assert.ok(
      aboutCode.includes('className="product-grid" data-testid="about-products-grid"'),
      'Must use product-grid class for proper 4-column layout'
    )
    assert.equal(
      aboutCode.includes('className="products-grid"'),
      false,
      'Must not contain unstyled "products-grid" class'
    )
  })

  it('10. Hero collage and mission image containers are structured for aspect-ratio integrity', () => {
    assert.ok(aboutCode.includes('about-collage-stage'))
    assert.ok(aboutCode.includes('about-collage-item item-main'))
    assert.ok(aboutCode.includes('about-collage-item item-sub-top'))
    assert.ok(aboutCode.includes('about-collage-item item-sub-bottom'))
    assert.ok(aboutCode.includes('mission-card-preview'))
  })
})
