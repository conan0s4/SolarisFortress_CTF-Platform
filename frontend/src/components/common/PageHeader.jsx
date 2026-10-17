export default function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="admin-page-header">
      <div className="header-body">
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <div className="header-actions">{actions}</div>
    </div>
  )
}
