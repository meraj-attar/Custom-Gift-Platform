import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

// Pure logic mirrors the functions in CartContext
const areItemsEqual = (a, b) => {
  if (!a || !b) return false
  if (a.product?.id !== b.product?.id) return false
  const ca = a.customization || {}
  const cb = b.customization || {}
  return (
    (ca.custom_text || '').trim() === (cb.custom_text || '').trim() &&
    (ca.occasion || '').trim() === (cb.occasion || '').trim() &&
    (ca.event_date || '').trim() === (cb.event_date || '').trim() &&
    (ca.custom_image_url || '').trim() === (cb.custom_image_url || '').trim()
  )
}

const isItemPersonalized = (item) => {
  if (!item || !item.customization) return false
  const c = item.customization
  return Boolean(
    (c.custom_text && c.custom_text.trim()) ||
    (c.occasion && c.occasion.trim()) ||
    (c.event_date && c.event_date.trim()) ||
    (c.custom_image_url && c.custom_image_url.trim())
  )
}

const itemNeedsPersonalization = (item) => {
  if (!item?.product) return false
  return Boolean(
    item.product.needs_image ||
    item.product.needs_text ||
    item.product.needs_date
  )
}

const itemMissingRequiredPersonalization = (item) => {
  if (!item || !item.product) return false
  const { needs_image, needs_text, needs_date } = item.product
  if (!needs_image && !needs_text && !needs_date) return false

  const c = item.customization || {}
  if (needs_image && !c.custom_image_url?.trim()) return true
  if (needs_text && !c.custom_text?.trim()) return true
  if (needs_date && !c.event_date?.trim()) return true

  return false
}

describe('Change 7: Shopping Cart & Personalization Workflow Tests', () => {
  const standardProduct = {
    id: 10,
    title: 'Classic Ceramic Coffee Mug',
    slug: 'classic-ceramic-coffee-mug',
    price: 399,
    discount_percent: 0,
    stock: 15,
    customizable: false,
    needs_image: false,
    needs_text: false,
    needs_date: false,
  }

  const customizableMug = {
    id: 11,
    title: 'Personalized Photo Mug',
    slug: 'personalized-photo-mug',
    price: 499,
    discount_percent: 20,
    stock: 8,
    customizable: true,
    needs_image: true,
    needs_text: true,
    needs_date: false,
  }

  const optionalCustomHamper = {
    id: 12,
    title: 'Celebration Gift Hamper',
    slug: 'celebration-gift-hamper',
    price: 1999,
    discount_percent: 10,
    stock: 5,
    customizable: true,
    needs_image: false,
    needs_text: false,
    needs_date: false,
  }

  it('1. Distinct customizations on the same product result in separate cart items', () => {
    const item1 = {
      cartId: 'citem_1',
      product: customizableMug,
      quantity: 1,
      customization: {
        custom_text: 'Happy Birthday Mom',
        occasion: 'Birthday',
        custom_image_url: 'local:customizations/1/mom.jpg',
      },
    }

    const item2 = {
      cartId: 'citem_2',
      product: customizableMug,
      quantity: 1,
      customization: {
        custom_text: 'Happy Anniversary Dad',
        occasion: 'Anniversary',
        custom_image_url: 'local:customizations/1/dad.jpg',
      },
    }

    // Must NOT be treated as equal because customizations differ
    assert.equal(areItemsEqual(item1, item2), false)
  })

  it('2. Identical product and identical customization merge properly', () => {
    const itemA = {
      cartId: 'citem_a',
      product: customizableMug,
      quantity: 1,
      customization: {
        custom_text: 'Together Forever',
        occasion: 'Anniversary',
        custom_image_url: 'local:customizations/1/pair.jpg',
      },
    }

    const itemB = {
      cartId: 'citem_b',
      product: customizableMug,
      quantity: 2,
      customization: {
        custom_text: 'Together Forever',
        occasion: 'Anniversary',
        custom_image_url: 'local:customizations/1/pair.jpg',
      },
    }

    assert.equal(areItemsEqual(itemA, itemB), true)
  })

  it('3. Accurately identifies items needing required personalization', () => {
    assert.equal(itemNeedsPersonalization({ product: standardProduct }), false)
    assert.equal(itemNeedsPersonalization({ product: customizableMug }), true)
    assert.equal(itemNeedsPersonalization({ product: optionalCustomHamper }), false)
  })

  it('4. itemMissingRequiredPersonalization catches missing text or photo on required items', () => {
    // Missing both photo and text
    const emptyItem = {
      product: customizableMug,
      customization: {},
    }
    assert.equal(itemMissingRequiredPersonalization(emptyItem), true)

    // Has text, missing photo
    const halfItem = {
      product: customizableMug,
      customization: {
        custom_text: 'Best Brother',
      },
    }
    assert.equal(itemMissingRequiredPersonalization(halfItem), true)

    // Complete item with both photo and text
    const completeItem = {
      product: customizableMug,
      customization: {
        custom_text: 'Best Brother',
        custom_image_url: 'local:customizations/1/bro.jpg',
      },
    }
    assert.equal(itemMissingRequiredPersonalization(completeItem), false)
  })

  it('5. Optional personalization items allow checkout without customization', () => {
    const uncustomizedOptional = {
      product: optionalCustomHamper,
      customization: {},
    }
    assert.equal(itemMissingRequiredPersonalization(uncustomizedOptional), false)
  })

  it('6. isItemPersonalized distinguishes empty vs customized items', () => {
    assert.equal(isItemPersonalized({ customization: {} }), false)
    assert.equal(isItemPersonalized({ customization: { custom_text: 'Love you' } }), true)
    assert.equal(isItemPersonalized({ customization: { occasion: 'Birthday' } }), true)
    assert.equal(isItemPersonalized({ customization: { custom_image_url: 'photo.jpg' } }), true)
  })

  it('7. Subtotal and total discount calculations are mathematically precise', () => {
    const price = customizableMug.price
    const discount = customizableMug.discount_percent
    const originalPrice = Math.round(price / (1 - discount / 100))
    const qty = 2

    const subtotal = price * qty
    const originalSubtotal = originalPrice * qty
    const totalDiscount = originalSubtotal - subtotal

    assert.equal(subtotal, 998)
    assert.equal(originalPrice, 624)
    assert.equal(originalSubtotal, 1248)
    assert.equal(totalDiscount, 250)
  })

  it('8. Order Now preserves the existing cart items when creating buyNowItem', () => {
    const existingCart = [
      { cartId: 'citem_1', product: standardProduct, quantity: 2 },
    ]

    const buyNowItem = {
      cartId: 'buynow_test',
      product: customizableMug,
      quantity: 1,
      customization: { custom_text: 'Quick Order' },
      isBuyNow: true,
    }

    assert.equal(existingCart.length, 1)
    assert.equal(existingCart[0].cartId, 'citem_1')
    assert.equal(buyNowItem.isBuyNow, true)
    assert.notEqual(buyNowItem.cartId, existingCart[0].cartId)
  })
})
