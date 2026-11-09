import { useEffect, useState } from 'react'
import api, { resolveImageUrl } from '../services/api'

export default function CustomizationImage({ orderId, itemId, reference, alt = 'Customer personalization', className = '' }) {
  const [src, setSrc] = useState(() => reference && !reference.startsWith('local:') ? resolveImageUrl(reference) : '')
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!reference) return undefined
    if (!reference.startsWith('local:')) {
      setSrc(resolveImageUrl(reference))
      setFailed(false)
      return undefined
    }

    let objectUrl = ''
    let active = true
    setFailed(false)
    setSrc('')

    api.get(`/orders/${orderId}/items/${itemId}/custom-image`, { responseType: 'blob' })
      .then(({ data }) => {
        if (!active) return
        objectUrl = URL.createObjectURL(data)
        setSrc(objectUrl)
      })
      .catch(() => active && setFailed(true))

    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [orderId, itemId, reference])

  if (!reference) return null
  if (failed) return <span className="custom-image-fallback">Private photo unavailable</span>
  if (!src) return <span className="custom-image-loading">Loading private photo…</span>
  return <img className={`customization-photo ${className}`.trim()} src={src} alt={alt} />
}
