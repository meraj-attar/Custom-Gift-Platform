/**
 * WhatsApp Integration Utilities for CustomGift
 * WhatsApp Number: +91 84850 89678 (Indian country code 91)
 */

export const WHATSAPP_PHONE = '918485089678'
export const WHATSAPP_PHONE_DISPLAY = '+91 84850 89678'

/**
 * Builds the dynamic WhatsApp deep link for product customization inquiry
 * @param {Object} product - Product model containing id, title, slug
 * @param {string} [origin] - Optional base origin URL
 * @returns {string} Fully encoded WhatsApp URL
 */
export function getProductWhatsAppUrl(product, origin) {
  if (!product) {
    return `https://wa.me/${WHATSAPP_PHONE}`
  }

  const baseOrigin =
    origin || (typeof window !== 'undefined' && window.location?.origin ? window.location.origin : '')
  const productUrl = baseOrigin
    ? `${baseOrigin}/products/${product.slug || product.id}`
    : `/products/${product.slug || product.id}`

  const text =
    `Hi, I am interested in customizing this product. Please share the available customization options and pricing.\n\n` +
    `Product Name: ${product.title}\n` +
    `Product ID: ${product.id}\n` +
    `Product URL: ${productUrl}`

  return `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(text)}`
}
