export default function StatCard({ label, value, sub, variant = 'default' }) {
  let valClass = 'stat-value'
  if (variant === 'primary') valClass += ' primary'
  if (variant === 'accent') valClass += ' accent'

  return (
    <div className="stat-card">
      <span className="stat-label">{label}</span>
      <span className={valClass}>{value}</span>
      {sub && <span className="stat-sub">{sub}</span>}
    </div>
  )
}
