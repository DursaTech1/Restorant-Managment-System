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
  const [query, setQuery] = useState('')
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

  const normalizedQuery = query.trim().toLowerCase()
  const visibleItems = items.filter((m) => {
    if (!normalizedQuery) return true
    const hay = `${m.name} ${m.description ?? ''}`.toLowerCase()
    return hay.includes(normalizedQuery)
  })
  const availableCount = items.filter((m) => m.is_available).length

  return (
    <>
      <PageHeader
        title="Menu"
        subtitle="Live from your kitchen catalog. Toggle to show only dishes you are serving right now."
      />

      <div className="menu-toolbar">
        <div className="menu-toolbar__left">
          <label className="toggle">
            <input type="checkbox" checked={onlyAvail} onChange={(e) => setOnlyAvail(e.target.checked)} />
            Show available only
          </label>
          <span className="menu-kpi">{availableCount} available</span>
          <span className="menu-kpi">{items.length} total</span>
        </div>
        <div className="menu-search">
          <label className="visually-hidden" htmlFor="menu-search-input">
            Search dishes
          </label>
          <input
            id="menu-search-input"
            type="search"
            placeholder="Search dish name or description..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
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

      {!loading && items.length > 0 && visibleItems.length === 0 && (
        <EmptyState
          icon="🔎"
          title="No menu items match"
          hint="Try a different search phrase or clear the filters."
          action={
            <button type="button" className="btn btn-ghost" onClick={() => setQuery('')}>
              Clear search
            </button>
          }
        />
      )}

      {!loading && visibleItems.length > 0 && (
        <div className="card-grid">
          {visibleItems.map((m) => (
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
