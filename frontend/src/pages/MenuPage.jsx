import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, formatApiError } from '../api'
import PageHeader from '../components/PageHeader.jsx'
import MenuItemMedia from '../components/MenuItemMedia.jsx'
import SkeletonMenu from '../components/SkeletonMenu.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { usePageTitle } from '../hooks/usePageTitle'
import { formatMoney } from '../utils/format.js'

export default function MenuPage() {
  usePageTitle('Menu')
  const [items, setItems] = useState([])
  const [onlyAvail, setOnlyAvail] = useState(false)
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setErr('')
    api
      .getMenu(onlyAvail)
      .then((data) => {
        if (!cancelled) setItems(Array.isArray(data) ? data : [])
      })
      .catch((e) => {
        if (!cancelled) setErr(formatApiError(e.data) || e.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [onlyAvail])

  return (
    <>
      <PageHeader
        title="Menu"
        subtitle="Live from your kitchen catalog. Toggle to show only dishes you are serving right now."
      />

      <div className="toolbar">
        <label className="toggle">
          <input type="checkbox" checked={onlyAvail} onChange={(e) => setOnlyAvail(e.target.checked)} />
          Show available only
        </label>
      </div>

      {err && (
        <div className="alert alert-error" style={{ marginBottom: '1.25rem' }} role="alert">
          {err}
        </div>
      )}

      {loading && <SkeletonMenu count={6} />}

      {!loading && items.length === 0 && (
        <EmptyState
          icon="🍽️"
          title="No dishes yet"
          hint="Add menu items in Django admin, then refresh this page."
          action={
            <Link to="/place-order" className="btn btn-primary">
              Go to place order
            </Link>
          }
        />
      )}

      {!loading && items.length > 0 && (
        <div className="card-grid">
          {items.map((m) => (
            <article key={m.id} className="card card--menu">
              <MenuItemMedia imageUrl={m.image_url} name={m.name} variant="card" />
              <div className="card--menu__body">
                <span className={`badge ${m.is_available ? 'ok' : 'warn'}`}>
                  {m.is_available ? 'Available' : 'Unavailable'}
                </span>
                <h3>{m.name}</h3>
                <p className="meta">{m.description?.trim() ? m.description : 'No description yet.'}</p>
                <div className="card__price">{formatMoney(m.price)}</div>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  )
}
