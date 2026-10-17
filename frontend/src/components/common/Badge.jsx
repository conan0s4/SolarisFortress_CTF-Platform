export default function Badge({ children, variant = 'default', style = {} }) {
  // variant: solved, success, danger, warning, accent, info, diff-easy, diff-medium, diff-hard, diff-insane
  let className = 'badge'
  if (variant && variant !== 'default') {
    className += ` ${variant}`
  }

  return (
    <span className={className} style={style}>
      {children}
    </span>
  )
}
