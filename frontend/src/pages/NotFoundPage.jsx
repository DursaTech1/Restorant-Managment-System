import { Link } from 'react-router-dom'
import { usePageTitle } from '../hooks/usePageTitle'

export default function NotFoundPage() {
  usePageTitle('Page not found')
  return (
    <div className="not-found">
      <h1 aria-hidden="true">404</h1>
      <h2 className="page-title" style={{ marginTop: '0.5rem' }}>
        This page does not exist
      </h2>
      <p className="page-desc" style={{ margin: '0 auto 1.5rem' }}>
        The URL may be wrong or the page was removed.
      </p>
      <Link to="/" className="btn btn-primary">
        Back to menu
      </Link>
    </div>
  )
}
