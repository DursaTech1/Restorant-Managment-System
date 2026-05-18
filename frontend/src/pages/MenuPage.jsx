import { useEffect, useState, useCallback, useMemo } from 'react'
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
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  // Fetch menu data when availability filter changes
  useEffect(() => {
    let cancelled = false

    const fetchMenu = async () => {
      setLoading(true)
      setError('')
      
      try {
        const data = await api.getMenu(onlyAvail)
        if (!cancelled) {
          setItems(Array.isArray(data) ? data : [])
        }
      } catch (err) {
        if (!cancelled) {
          setError(formatApiError(err?.data) || err?.message || 'Failed to load menu')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchMenu()

    return () => {
      cancelled = true
    }
  }, [onlyAvail])

  // Filter items by search query (memoized for performance)
  const filteredItems = useMemo(() => {
    const searchTerm = query.trim().toLowerCase()
    if (!searchTerm) return items

    return items.filter((item) => {
      const searchableText = `${item.name} ${item.description ?? ''}`.toLowerCase()
      return searchableText.includes(searchTerm)
    })
  }, [items, query])

  // Derived state
  const availableCount = items.filter((item) => item.is_available).length
  const hasItems = items.length > 0
  const hasFilteredItems = filteredItems.length > 0
  const showEmptyState = !loading && !hasItems
  const showNoResults = !loading && hasItems && !hasFilteredItems
  const showMenuGrid = !loading && hasFilteredItems

  // Event handlers (memoized)
  const handleToggleAvailability = useCallback((e) => {
    setOnlyAvail(e.target.checked)
  }, [])

  const handleSearchChange = useCallback((e) => {
    setQuery(e.target.value)
  }, [])

  const handleClearSearch = useCallback(() => {
    setQuery('')
  }, [])

  return (
    <>
      <PageHeader
        title="Menu"
        subtitle="Live from your kitchen catalog. Toggle to show only dishes you are serving right now."
      />

      <div className="menu-toolbar">
        <div className="menu-toolbar__left">
          <label className="toggle">
            <input
              type="checkbox"
              checked={onlyAvail}
              onChange={handleToggleAvailability}
              aria-label="Show available items only"
            />
            Show available only
          </label>
          <span className="menu-kpi" aria-label={`${availableCount} available items`}>
            {availableCount} available
          </span>
          <span className="menu-kpi" aria-label={`${items.length} total items`}>
            {items.length} total
          </span>
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
            onChange={handleSearchChange}
            aria-label="Search menu items"
          />
        </div>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1.25rem' }} role="alert">
          <strong>Error:</strong> {error}
        </div>
      )}

      {loading && <SkeletonMenu count={6} />}

      {showEmptyState && (
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

      {showNoResults && (
        <EmptyState
          icon="🔎"
          title="No menu items match"
          hint={query.trim() ? `No results found for "${query.trim()}"` : 'Try a different search phrase or clear the filters.'}
          action={
            <button type="button" className="btn btn-ghost" onClick={handleClearSearch}>
              Clear search
            </button>
          }
        />
      )}

      {showMenuGrid && (
        <div className="card-grid">
          {filteredItems.map((item) => (
            <article key={item.id} className="card card--menu">
              <MenuItemMedia imageUrl={item.image_url} name={item.name} variant="card" />
              <div className="card--menu__body">
                <span className={`badge ${item.is_available ? 'ok' : 'warn'}`}>
                  {item.is_available ? 'Available' : 'Unavailable'}
                </span>
                <h3>{item.name}</h3>
                <p className="meta">{item.description?.trim() || 'No description yet.'}</p>
                <div className="card__price">{formatMoney(item.price)}</div>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  )
}