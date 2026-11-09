import { Check } from 'lucide-react'

const STEPS = ['CONFIRMED', 'PROCESSING', 'CUSTOMIZING', 'SHIPPED', 'DELIVERED']
const LABELS = { CONFIRMED: 'Confirmed', PROCESSING: 'Processing', CUSTOMIZING: 'Customizing', SHIPPED: 'Shipped', DELIVERED: 'Delivered' }

export default function OrderTimeline({ status }) {
  if (status === 'CANCELLED') return <div className="cancelled-banner">This order was cancelled.</div>
  const normalized = status === 'PLACED' || status === 'PAYMENT_PENDING' ? 'CONFIRMED' : status
  const activeIndex = STEPS.indexOf(normalized)
  return <div className="order-timeline">
    {STEPS.map((step, index) => <div className={`timeline-step ${index <= activeIndex ? 'done' : ''}`} key={step}>
      <span className="timeline-dot">{index <= activeIndex ? <Check size={14} /> : index + 1}</span>
      <span>{LABELS[step]}</span>
    </div>)}
  </div>
}
