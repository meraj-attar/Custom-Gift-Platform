import { computePasswordStrength } from '../utils/validators'

export default function PasswordStrengthMeter({ password }) {
  if (!password) return null

  const { score, label, color } = computePasswordStrength(password)

  return (
    <div className="password-meter" aria-live="polite">
      <div className="meter-bars">
        <div
          className="meter-bar"
          style={{ backgroundColor: score >= 1 ? color : undefined }}
        />
        <div
          className="meter-bar"
          style={{ backgroundColor: score >= 2 ? color : undefined }}
        />
        <div
          className="meter-bar"
          style={{ backgroundColor: score >= 3 ? color : undefined }}
        />
      </div>
      <div className="meter-label-row">
        <span>Password strength: <strong style={{ color }}>{label}</strong></span>
        <small>Use 8+ chars, upper, lower & number</small>
      </div>
    </div>
  )
}
