import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, formatApiError } from '../api'
import PageHeader from '../components/PageHeader.jsx'
import MenuItemMedia from '../components/MenuItemMedia.jsx'
import { usePageTitle } from '../hooks/usePageTitle'
import { formatMoney } from '../utils/format.js'

export default function PlaceOrderPage() {
  usePageTitle('Place order')
  const [menu, setMenu] = useState([])
  const [tables, setTables] = useState([])
  const [boot, setBoot] = useState(true)
  const [tableId, setTableId] = useState('')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState([{ menu_item_id: '', quantity: 1 }])
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    Promise.all([api.getMenu(true), api.getTables()])
      .then(([m, t]) => {
        if (cancelled) return
        setMenu(Array.isArray(m) ? m : [])
        setTables(Array.isArray(t) ? t : [])
      })
      .catch((e) => {
        if (!cancelled) setErr(formatApiError(e.data) || e.message)
      })
      .finally(() => {
        if (!cancelled) setBoot(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const priceById = useMemo(() => {
    const m = {}
    for (const item of menu) m[item.id] = Number(item.price)
    return m
  }, [menu])

  const menuById = useMemo(() => {
    const o = {}
    for (const item of menu) o[item.id] = item
    return o
  }, [menu])

  const estimated = useMemo(() => {
    let t = 0
    for (const row of lines) {
      const id = Number(row.menu_item_id)
      const q = Number(row.quantity) || 0
      if (id && priceById[id]) t += priceById[id] * q
    }
    return t
  }, [lines, priceById])

  const addLine = () => setLines((L) => [...L, { menu_item_id: '', quantity: 1 }])
  const removeLine = (i) => setLines((L) => L.filter((_, j) => j !== i))
  const setLine = (i, field, val) =>
    setLines((L) => L.map((row, j) => (j === i ? { ...row, [field]: val } : row)))

  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    setOk('')
    const payload = {
      notes,
      lines: lines
        .filter((l) => l.menu_item_id)
        .map((l) => ({ menu_item_id: Number(l.menu_item_id), quantity: Math.max(1, Number(l.quantity) || 1) })),
    }
    if (tableId) payload.table_id = Number(tableId)
    if (!payload.lines.length) {
      setErr('Choose at least one dish and quantity.')
      return
    }
    setLoading(true)
    try {
      const order = await api.placeOrder(payload)
      setOk(`Order #${order.id} is confirmed and sent to the kitchen.`)
      setLines([{ menu_item_id: '', quantity: 1 }])
      setNotes('')
      setTableId('')
    } catch (e) {
      setErr(formatApiError(e.data) || e.message)
    } finally {
      setLoading(false)
    }
  }

  if (boot) {
    return (
      <>
        <PageHeader title="Place order" subtitle="Loading menu and tables…" />
        <div className="loading-inline" aria-live="polite">
          <span className="spinner" />
          Preparing form…
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Place order"
        subtitle="Build a ticket, attach an optional table, and send it to the API. Stock updates automatically from your recipes."
      />

      {err && (
        <div className="alert alert-error" style={{ marginBottom: '1rem' }} role="alert">
          {err}
        </div>
      )}
      {ok && (
        <div className="alert alert-success" style={{ marginBottom: '1rem' }} role="status">
          {ok}{' '}
          <Link to="/orders">Track in orders</Link>
        </div>
      )}

      {menu.length === 0 && (
        <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
          No available menu items. Mark items as available in admin or add dishes first.
        </div>
      )}

      <form className="form" onSubmit={submit} style={{ maxWidth: '640px' }}>
        <div className="form-row">
          <label htmlFor="po-table">Table</label>
          <select id="po-table" value={tableId} onChange={(e) => setTableId(e.target.value)} aria-label="Table (optional)">
            <option value="">Dine-in: no table / takeaway</option>
            {tables
              .filter((t) => t.is_active)
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label} · {t.seats} seats
                </option>
              ))}
          </select>
        </div>
        <div className="form-row">
          <label htmlFor="po-notes">Special requests</label>
          <textarea
            id="po-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Allergies, birthday, pacing…"
            rows={3}
          />
        </div>

        <div>
          <div className="form-section-label">Dishes</div>
          {lines.map((row, i) => {
            const picked = row.menu_item_id ? menuById[row.menu_item_id] : null
            return (
              <div key={i} className="order-line-row">
                {picked ? (
                  <MenuItemMedia variant="thumb" imageUrl={picked.image_url} name={picked.name} />
                ) : (
                  <div className="menu-thumb menu-thumb--placeholder" aria-hidden="true" />
                )}
                <div className="line-editor">
                  <div className="form-row">
                    <label className="visually-hidden" htmlFor={`po-item-${i}`}>
                      Dish {i + 1}
                    </label>
                    <select
                      id={`po-item-${i}`}
                      value={row.menu_item_id}
                      onChange={(e) => setLine(i, 'menu_item_id', e.target.value)}
                    >
                      <option value="">Select a dish…</option>
                      {menu.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} · {formatMoney(m.price)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-row" style={{ maxWidth: '108px', flex: 'none' }}>
                    <label className="visually-hidden" htmlFor={`po-qty-${i}`}>
                      Quantity
                    </label>
                    <input
                      id={`po-qty-${i}`}
                      type="number"
                      min={1}
                      value={row.quantity}
                      onChange={(e) => setLine(i, 'quantity', e.target.value)}
                    />
                  </div>
                  {lines.length > 1 && (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeLine(i)}>
                      Remove
                    </button>
                  )}
                </div>
              </div>
            )
          })}
          <button type="button" className="btn btn-ghost btn-sm" onClick={addLine}>
            + Add another dish
          </button>
        </div>

        {estimated > 0 && (
          <div className="summary-strip">
            <span style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Estimated subtotal</span>
            <strong>{formatMoney(estimated)}</strong>
          </div>
        )}

        <button type="submit" className="btn btn-primary" disabled={loading || menu.length === 0}>
          {loading ? 'Sending…' : 'Send order'}
        </button>
      </form>
    </>
  )
}
