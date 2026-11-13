import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { WHATSAPP_PHONE, WHATSAPP_PHONE_DISPLAY, getProductWhatsAppUrl } from '../utils/whatsapp.js'

describe('WhatsApp Customization Integration Tests', () => {
  const sampleProductA = {
    id: 75,
    title: 'Personalized Our Beautiful Journey Photo Frame',
    slug: 'personalized-our-beautiful-journey-photo-frame',
    price: 799,
    category: 'Frames',
  }

  const sampleProductB = {
    id: 101,
    title: 'Personalized My Favorite Person Photo Mug',
    slug: 'personalized-my-favorite-person-photo-mug',
    price: 350,
    category: 'Mugs',
  }

  it('1. WhatsApp Phone Number is exactly 918485089678 (Indian country code 91)', () => {
    assert.equal(WHATSAPP_PHONE, '918485089678')
    assert.equal(WHATSAPP_PHONE_DISPLAY, '+91 84850 89678')
  })

  it('2. WhatsApp URL base points to wa.me with correct phone number', () => {
    const url = getProductWhatsAppUrl(sampleProductA, 'http://localhost:5173')
    assert.ok(url.startsWith('https://wa.me/918485089678?text='))
  })

  it('3. Prefilled text follows exact required format and includes Product Name, ID, and URL', () => {
    const origin = 'https://customgift.dev'
    const url = getProductWhatsAppUrl(sampleProductA, origin)

    const parsed = new URL(url)
    const textParam = parsed.searchParams.get('text')

    // Must contain required prompt text
    assert.ok(
      textParam.includes(
        'Hi, I am interested in customizing this product. Please share the available customization options and pricing.'
      )
    )
    assert.ok(textParam.includes('Product Name: Personalized Our Beautiful Journey Photo Frame'))
    assert.ok(textParam.includes('Product ID: 75'))
    assert.ok(
      textParam.includes(
        'Product URL: https://customgift.dev/products/personalized-our-beautiful-journey-photo-frame'
      )
    )
  })

  it('4. Generates unique dynamic links for distinct products', () => {
    const urlA = getProductWhatsAppUrl(sampleProductA, 'http://localhost:5173')
    const urlB = getProductWhatsAppUrl(sampleProductB, 'http://localhost:5173')

    assert.notEqual(urlA, urlB)
    assert.ok(urlA.includes(encodeURIComponent('Product ID: 75')))
    assert.ok(urlB.includes(encodeURIComponent('Product ID: 101')))
  })

  it('5. Safe fallback when product object is omitted', () => {
    const defaultUrl = getProductWhatsAppUrl(null)
    assert.equal(defaultUrl, 'https://wa.me/918485089678')
  })
})
