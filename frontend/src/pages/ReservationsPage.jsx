import { useEffect, useState } from 'react'
import { api, formatApiError } from '../api'
import PageHeader from '../components/PageHeader.jsx'
import { usePageTitle } from '../hooks/usePageTitle'
import { formatDateTime } from '../utils/format.js'

export default function ReservationsPage() {
  usePageTitle('Reservations')
  const [tables, setTables] = useState([])
  const [list, setList] = useState([])
  const [listLoading, setListLoading] = useState(true)
  const [form, setForm] = useState({
    table: '',
    customer_name: '',
    party_size: 2,
    starts_at: '',
    ends_at: '',
  })
  const [check, setCheck] = useState({ tableId: '', starts: '', ends: '', party: 2, result: null })
  const [checking, setChecking] = useState(false)
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')

  const load = () => {
    setListLoading(true)
    api
      .getReservations()
      .then((data) => setList(Array.isArray(data) ? data : []))
      .catch((e) => setErr(formatApiError(e.data) || e.message))
      .finally(() => setListLoading(false))
  }

  useEffect(() => {
    api
      .getTables()
      .then((t) => setTables(Array.isArray(t) ? t.filter((x) => x.is_active) : []))
      .catch(() => {})
    load()
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    setOk('')
    try {
      await api.createReservation({
        table: Number(form.table),
        customer_name: form.customer_name.trim(),
        party_size: Math.max(1, Number(form.party_size) || 1),
        starts_at: new Date(form.starts_at).toISOString(),
        ends_at: new Date(form.ends_at).toISOString(),
      })
      setOk('Reservation saved. The table is held for that window.')
      setForm((f) => ({ ...f, customer_name: '' }))
      load()
    } catch (e) {
      setErr(formatApiError(e.data) || e.message)
    }
  }

  const runCheck = async () => {
    setCheck((c) => ({ ...c, result: null }))
    if (!check.tableId || !check.starts || !check.ends) {
      setErr('Choose a table, start time, and end time to run the availability check.')
      return
    }
    setErr('')
    setChecking(true)
    try {
      const r = await api.getTableAvailability(check.tableId, {
        starts_at: new Date(check.starts).toISOString(),
        ends_at: new Date(check.ends).toISOString(),
        party_size: String(Math.max(1, Number(check.party) || 1)),
      })
      setCheck((c) => ({ ...c, result: r }))
    } catch (e) {
      setErr(formatApiError(e.data) || e.message)
    } finally {
      setChecking(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Reservations"
        subtitle="Preview table availability, then book. Overlapping holds are rejected by the API so you never double-book."
      />

      {err && (
        <div className="alert alert-error" style={{ marginBottom: '1rem' }} role="alert">
          {err}
        </div>
      )}
      {ok && (
        <div className="alert alert-success" style={{ marginBottom: '1rem' }} role="status">
          {ok}
        </div>
      )}

      <section className="panel">
        <h2 className="panel__title">1 · Check availability</h2>
        <div className="form" style={{ maxWidth: '560px' }}>
          <div className="form-row">
            <label htmlFor="chk-table">Table</label>
            <select id="chk-table" value={check.tableId} onChange={(e) => setCheck((c) => ({ ...c, tableId: e.target.value }))}>
              <option value="">Select a table…</option>
              {tables.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label} ({t.seats} seats)
                </option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <label htmlFor="chk-party">Party size</label>
            <input
              id="chk-party"
              type="number"
              min={1}
              value={check.party}
              onChange={(e) => setCheck((c) => ({ ...c, party: e.target.value }))}
            />
          </div>
          <div className="form-row">
            <label htmlFor="chk-start">Starts</label>
            <input
              id="chk-start"
              type="datetime-local"
              value={check.starts}
              onChange={(e) => setCheck((c) => ({ ...c, starts: e.target.value }))}
            />
          </div>
          <div className="form-row">
            <label htmlFor="chk-end">Ends</label>
            <input
              id="chk-end"
              type="datetime-local"
              value={check.ends}
              onChange={(e) => setCheck((c) => ({ ...c, ends: e.target.value }))}
            />
          </div>
          <button type="button" className="btn btn-ghost" onClick={runCheck} disabled={checking}>
            {checking ? 'Checking…' : 'Run availability check'}
          </button>
          {check.result && (
            <div
              className="card"
              style={{
                marginTop: '0.85rem',
                borderColor: check.result.available ? 'rgba(95, 212, 154, 0.35)' : 'rgba(240, 128, 112, 0.35)',
              }}
              role="status"
            >
              <strong style={{ color: check.result.available ? 'var(--ok)' : 'var(--danger)' }}>
                {check.result.available ? 'Table is free' : 'Not available'}
              </strong>
              {check.result.reason && <p className="meta" style={{ marginBottom: 0 }}>{check.result.reason}</p>}
            </div>
          )}
        </div>
      </section>

      <section className="panel">
        <h2 className="panel__title">2 · New reservation</h2>
        <form className="form" onSubmit={submit} style={{ maxWidth: '480px' }}>
          <div className="form-row">
            <label htmlFor="res-table">Table</label>
            <select id="res-table" required value={form.table} onChange={(e) => setForm((f) => ({ ...f, table: e.target.value }))}>
              <option value="">Select…</option>
              {tables.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <label htmlFor="res-name">Guest name</label>
            <input
              id="res-name"
              required
              autoComplete="name"
              value={form.customer_name}
              onChange={(e) => setForm((f) => ({ ...f, customer_name: e.target.value }))}
              placeholder="Name on the booking"
            />
          </div>
          <div className="form-row">
            <label htmlFor="res-party">Party size</label>
            <input
              id="res-party"
              type="number"
              min={1}
              required
              value={form.party_size}
              onChange={(e) => setForm((f) => ({ ...f, party_size: e.target.value }))}
            />
          </div>
          <div className="form-row">
            <label htmlFor="res-start">Starts</label>
            <input
              id="res-start"
              type="datetime-local"
              required
              value={form.starts_at}
              onChange={(e) => setForm((f) => ({ ...f, starts_at: e.target.value }))}
            />
          </div>
          <div className="form-row">
            <label htmlFor="res-end">Ends</label>
            <input
              id="res-end"
              type="datetime-local"
              required
              value={form.ends_at}
              onChange={(e) => setForm((f) => ({ ...f, ends_at: e.target.value }))}
            />
          </div>
          <button type="submit" className="btn btn-primary">
            Confirm reservation
          </button>
        </form>
      </section>

      <section className="panel" style={{ marginBottom: 0 }}>
        <h2 className="panel__title">Bookings</h2>
        {listLoading ? (
          <div className="loading-inline" aria-live="polite">
            <span className="spinner" />
            Loading reservations…
          </div>
        ) : list.length === 0 ? (
          <p className="page-desc" style={{ margin: 0 }}>
            No reservations yet.
          </p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Guest</th>
                  <th scope="col">Table</th>
                  <th scope="col">Party</th>
                  <th scope="col">Start</th>
                  <th scope="col">End</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {list.map((r) => (
                  <tr key={r.id}>
                    <td>{r.customer_name}</td>
                    <td>{tables.find((t) => t.id === r.table)?.label ?? `#${r.table}`}</td>
                    <td>{r.party_size}</td>
                    <td>{formatDateTime(r.starts_at)}</td>
                    <td>{formatDateTime(r.ends_at)}</td>
                    <td>
                      <span className="badge res-badge">{r.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  )
}
