import { useCallback, useEffect, useState } from 'react'
import { api, formatApiError } from '../api'
import PageHeader from '../components/PageHeader.jsx'
import { usePageTitle } from '../hooks/usePageTitle'
import EmptyState from '../components/EmptyState.jsx'
import { formatMoney } from '../utils/format.js'

function todayISO() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export default function ReportsPage() {
  usePageTitle('Reports')
  const [date, setDate] = useState(todayISO())
  const [sales, setSales] = useState(null)
  const [salesLoading, setSalesLoading] = useState(true)
  const [alerts, setAlerts] = useState([])
  const [alertsLoading, setAlertsLoading] = useState(true)
  const [err, setErr] = useState('')

  const loadSales = useCallback(() => {
    setErr('')
    setSalesLoading(true)
    api
      .getDailySales(date)
      .then(setSales)
      .catch((e) => setErr(formatApiError(e.data) || e.message))
      .finally(() => setSalesLoading(false))
  }, [date])

  const loadAlerts = useCallback(() => {
    setAlertsLoading(true)
    api
      .getStockAlerts()
      .then((data) => setAlerts(Array.isArray(data) ? data : []))
      .catch((e) => setErr(formatApiError(e.data) || e.message))
      .finally(() => setAlertsLoading(false))
  }, [])

  useEffect(() => {
    loadSales()
  }, [loadSales])

  useEffect(() => {
    loadAlerts()
  }, [loadAlerts])

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle="Close-of-day performance and ingredients that need attention. Figures reflect served checks for the selected date."
      />

      {err && (
        <div className="alert alert-error" style={{ marginBottom: '1rem' }} role="alert">
          {err}
        </div>
      )}

      <section className="panel">
        <h2 className="panel__title">Daily sales</h2>
        <div className="toolbar" style={{ marginBottom: 0 }}>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Report date" />
          <button type="button" className="btn btn-primary btn-sm" onClick={loadSales} disabled={salesLoading}>
            {salesLoading ? 'Loading…' : 'Apply date'}
          </button>
        </div>
        {salesLoading && (
          <div className="loading-inline" style={{ marginTop: '1rem' }} aria-live="polite">
            <span className="spinner" />
            Crunching numbers…
          </div>
        )}
        {!salesLoading && sales && (
          <div className="stat-grid">
            <div className="stat">
              <div className="stat__value">{sales.served_orders}</div>
              <div className="stat__label">Served orders</div>
            </div>
            <div className="stat">
              <div className="stat__value">{formatMoney(sales.total_revenue)}</div>
              <div className="stat__label">Revenue ({sales.date})</div>
            </div>
          </div>
        )}
      </section>

      <section className="panel" style={{ marginBottom: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <h2 className="panel__title" style={{ marginBottom: 0 }}>
            Stock alerts
          </h2>
          <button type="button" className="btn btn-ghost btn-sm" onClick={loadAlerts} disabled={alertsLoading}>
            {alertsLoading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
        {alertsLoading && (
          <div className="loading-inline" style={{ marginTop: '1rem' }} aria-live="polite">
            <span className="spinner" />
            Scanning levels…
          </div>
        )}
        {!alertsLoading && alerts.length === 0 && (
          <EmptyState
            className="empty-state--compact"
            icon="✓"
            title="Stock looks healthy"
            hint="Nothing is sitting at or below its alert threshold right now."
          />
        )}
        {!alertsLoading && alerts.length > 0 && (
          <div className="card-grid" style={{ marginTop: '1rem' }}>
            {alerts.map((a) => (
              <article key={a.id} className="card">
                <span className="badge warn">Reorder soon</span>
                <h3>{a.name}</h3>
                <p className="meta">
                  On hand <strong style={{ color: 'var(--text)' }}>{a.quantity}</strong> {a.unit} · alerts below{' '}
                  <strong style={{ color: 'var(--text)' }}>{a.low_stock_threshold}</strong>
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  )
}
