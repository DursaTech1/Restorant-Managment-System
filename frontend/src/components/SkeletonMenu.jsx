export default function SkeletonMenu({ count = 6 }) {
  return (
    <div className="card-grid" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="skeleton-card">
          <div className="skeleton skeleton--media" />
          <div className="skeleton skeleton--badge" />
          <div className="skeleton skeleton--title" />
          <div className="skeleton skeleton--line" />
          <div className="skeleton skeleton--line short" />
          <div className="skeleton skeleton--price" />
        </div>
      ))}
    </div>
  )
}
