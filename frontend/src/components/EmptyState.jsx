export default function EmptyState({ icon, title, hint, action, className = '' }) {
  return (
    <div className={`empty-state ${className}`.trim()} role="status">
      <div className="empty-state__icon" aria-hidden="true">
        {icon}
      </div>
      <h2 className="empty-state__title">{title}</h2>
      {hint && <p className="empty-state__hint">{hint}</p>}
      {action && <div className="empty-state__action">{action}</div>}
    </div>
  )
}
