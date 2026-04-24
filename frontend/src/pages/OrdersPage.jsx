import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, formatApiError } from '../api'
import PageHeader from '../components/PageHeader.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { usePageTitle } from '../hooks/usePageTitle'
import { nextOrderStatuses, statusLabel, statusPillClass } from '../orderStatus'
import { formatDateTime } from '../utils/format.js'

export default function OrdersPage() {
  usePageTitle('Orders')
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(null)

  const load = useCallback(() => {
    setErr('')
    setLoading(true)
    api
      .getOrders()
      .then((data) => setOrders(Array.isArray(data) ? data : []))
      .catch((e) => setErr(formatApiError(e.data) || e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const advance = async (id, status) => {
    setBusy(`${id}-${status}`)
    setErr('')
    try {
      await api.patchOrderStatus(id, status)
      await load()
    } catch (e) {
      setErr(formatApiError(e.data) || e.message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      <PageHeader
        title="Orders"
        subtitle="Track every ticket from confirmation through the pass. Quick actions use the same workflow as the kitchen API."
        actions={
          <button type="button" className="btn btn-ghost btn-sm" onClick={load} disabled={loading}>
            Refresh
          </button>
        }
      />

      {err && (
        <div className="alert alert-error" style={{ marginBottom: '1rem' }} role="alert">
          {err}
        </div>
      )}

      {loading && (
        <div className="loading-inline" style={{ marginBottom: '1rem' }} aria-live="polite">
          <span className="spinner" />
          Loading orders…
        </div>
      )}

      {!loading && orders.length === 0 && (
        <EmptyState
          icon="📋"
          title="No tickets in the queue"
          hint="When guests place orders, they will appear here with live status."
          action={
            <Link to="/place-order" className="btn btn-primary">
              Place the first order
            </Link>
          }
        />
      )}

      {!loading && orders.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Order</th>
                <th scope="col">Table</th>
                <th scope="col">Status</th>
                <th scope="col">Opened</th>
                <th scope="col">Next step</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>
                    <Link className="table-link" to={`/orders/${o.id}`}>
                      #{o.id}
                    </Link>
                  </td>
                  <td>{o.table ? o.table.label : '—'}</td>
                  <td>
                    <span className={`status-pill ${statusPillClass(o.status)}`}>{statusLabel(o.status)}</span>
                  </td>
                  <td>{formatDateTime(o.created_at)}</td>
                  <td>
                    <div className="stack">
                      {nextOrderStatuses(o.status).map((s) => (
                        <button
                          key={s}
                          type="button"
                          className={`btn btn-sm ${s === 'cancelled' ? 'btn-danger' : 'btn-ghost'}`}
                          disabled={busy === `${o.id}-${s}`}
                          onClick={() => advance(o.id, s)}
                        >
                          {statusLabel(s)}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
