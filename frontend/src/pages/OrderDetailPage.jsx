import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, formatApiError } from '../api'
import MenuItemMedia from '../components/MenuItemMedia.jsx'
import { usePageTitle } from '../hooks/usePageTitle'
import { nextOrderStatuses, statusLabel, statusPillClass } from '../orderStatus'
import { formatDateTime, formatMoney } from '../utils/format.js'

export default function OrderDetailPage() {
  const { id } = useParams()
  const [order, setOrder] = useState(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  usePageTitle(order ? `Order #${order.id}` : `Order #${id}`)

  useEffect(() => {
    setErr('')
    setOrder(null)
    api
      .getOrder(id)
      .then(setOrder)
      .catch((e) => setErr(formatApiError(e.data) || e.message))
  }, [id])

  const advance = async (status) => {
    setBusy(true)
    setErr('')
    try {
      const updated = await api.patchOrderStatus(Number(id), status)
      setOrder(updated)
    } catch (e) {
      setErr(formatApiError(e.data) || e.message)
    } finally {
      setBusy(false)
    }
  }

  if (err && !order) {
    return (
      <>
        <Link to="/orders" className="back-link">
          ← Back to orders
        </Link>
        <div className="alert alert-error" role="alert">
          {err}
        </div>
      </>
    )
  }

  if (!order) {
    return (
      <>
        <Link to="/orders" className="back-link">
          ← Back to orders
        </Link>
        <div className="loading-inline" aria-live="polite">
          <span className="spinner" />
          Loading order…
        </div>
      </>
    )
  }

  const subtotal = order.lines?.reduce((s, l) => s + Number(l.unit_price) * l.quantity, 0) ?? 0

  return (
    <>
      <Link to="/orders" className="back-link">
        ← Back to orders
      </Link>

      <div className="order-hero">
        <div>
          <h1 className="page-title" style={{ marginBottom: '0.5rem' }}>
            Order #{order.id}
          </h1>
          <div className="order-hero__meta">
            Opened {formatDateTime(order.created_at)}
            {order.table && <> · {order.table.label}</>}
          </div>
        </div>
        <span className={`status-pill status-pill--lg ${statusPillClass(order.status)}`}>{statusLabel(order.status)}</span>
      </div>

      {err && (
        <div className="alert alert-error" style={{ marginBottom: '1rem' }} role="alert">
          {err}
        </div>
      )}

      {nextOrderStatuses(order.status).length > 0 && (
        <div className="stack" style={{ marginBottom: '1.5rem' }}>
          {nextOrderStatuses(order.status).map((s) => (
            <button
              key={s}
              type="button"
              className={`btn btn-sm ${s === 'cancelled' ? 'btn-danger' : 'btn-primary'}`}
              disabled={busy}
              onClick={() => advance(s)}
            >
              {s === 'cancelled' ? 'Cancel order' : `Mark ${statusLabel(s)}`}
            </button>
          ))}
        </div>
      )}

      {order.notes && (
        <div className="panel" style={{ marginBottom: '1.25rem' }}>
          <div className="panel__title">Guest notes</div>
          <p style={{ margin: 0, color: 'var(--text-soft)', lineHeight: 1.55 }}>{order.notes}</p>
        </div>
      )}

      <div className="panel" style={{ marginBottom: 0 }}>
        <div className="panel__title">Line items</div>
        <div className="table-wrap" style={{ border: 'none', boxShadow: 'none', borderRadius: 'var(--radius-sm)' }}>
          <table>
            <thead>
              <tr>
                <th scope="col">Dish</th>
                <th scope="col">Qty</th>
                <th scope="col">Each</th>
                <th scope="col">Line</th>
              </tr>
            </thead>
            <tbody>
              {(order.lines ?? []).map((l) => (
                <tr key={l.id}>
                  <td>
                    <div className="order-line__dish">
                      <MenuItemMedia
                        variant="thumb"
                        imageUrl={l.menu_item?.image_url}
                        name={l.menu_item?.name ?? 'Item'}
                      />
                      <span>{l.menu_item?.name ?? '—'}</span>
                    </div>
                  </td>
                  <td>{l.quantity}</td>
                  <td>{formatMoney(l.unit_price)}</td>
                  <td>{formatMoney(Number(l.unit_price) * l.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ margin: '1rem 0 0', textAlign: 'right', fontSize: '1.05rem' }}>
          <strong style={{ color: 'var(--muted)', fontWeight: 500 }}>Subtotal </strong>
          <strong style={{ fontFamily: 'var(--font-display)', color: 'var(--accent)' }}>{formatMoney(subtotal)}</strong>
        </p>
      </div>
    </>
  )
}
