import { useCallback, useEffect, useState } from 'react'
import { api, formatApiError } from '../api'
import PageHeader from '../components/PageHeader.jsx'
import { usePageTitle } from '../hooks/usePageTitle'

function rowDirty(r, edits) {
  const e = edits[r.id]
  if (!e) return false
  return String(e.quantity) !== String(r.quantity) || String(e.low_stock_threshold) !== String(r.low_stock_threshold)
}

export default function InventoryPage() {
  usePageTitle('Inventory')
  const [rows, setRows] = useState([])
  const [edits, setEdits] = useState({})
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(null)

  const load = useCallback(() => {
    setErr('')
    setLoading(true)
    api
      .getInventory()
      .then((data) => {
        const list = Array.isArray(data) ? data : []
        setRows(list)
        const e = {}
        for (const r of list) {
          e[r.id] = { quantity: String(r.quantity), low_stock_threshold: String(r.low_stock_threshold) }
        }
        setEdits(e)
      })
      .catch((e) => setErr(formatApiError(e.data) || e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const saveRow = async (id) => {
    setSaving(id)
    setErr('')
    setMsg('')
    const row = edits[id]
    if (!row) return
    try {
      await api.patchInventory(id, {
        quantity: row.quantity,
        low_stock_threshold: row.low_stock_threshold,
      })
      setMsg('Changes saved.')
      load()
    } catch (e) {
      setErr(formatApiError(e.data) || e.message)
    } finally {
      setSaving(null)
    }
  }

  const change = (id, field, val) => {
    setEdits((E) => ({ ...E, [id]: { ...E[id], [field]: val } }))
  }

  return (
    <>
      <PageHeader
        title="Inventory"
        subtitle="Adjust on-hand quantities and alert thresholds. Recipes tie these SKUs to menu items when orders fire."
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
      {msg && (
        <div className="alert alert-success" style={{ marginBottom: '1rem' }} role="status">
          {msg}
        </div>
      )}

      {loading ? (
        <div className="loading-inline" aria-live="polite">
          <span className="spinner" />
          Loading stock…
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Ingredient</th>
                <th scope="col">On hand</th>
                <th scope="col">Unit</th>
                <th scope="col">Alert at</th>
                <th scope="col">Save</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className={rowDirty(r, edits) ? 'row-dirty' : undefined}>
                  <td>
                    <strong style={{ fontWeight: 600 }}>{r.name}</strong>
                    {r.is_low_stock && (
                      <span className="badge warn" style={{ marginLeft: '0.4rem' }}>
                        Low
                      </span>
                    )}
                  </td>
                  <td>
                    <input
                      className="table-input"
                      aria-label={`Quantity for ${r.name}`}
                      value={edits[r.id]?.quantity ?? ''}
                      onChange={(e) => change(r.id, 'quantity', e.target.value)}
                    />
                  </td>
                  <td>{r.unit}</td>
                  <td>
                    <input
                      className="table-input"
                      aria-label={`Low threshold for ${r.name}`}
                      value={edits[r.id]?.low_stock_threshold ?? ''}
                      onChange={(e) => change(r.id, 'low_stock_threshold', e.target.value)}
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      disabled={saving === r.id || !rowDirty(r, edits)}
                      onClick={() => saveRow(r.id)}
                    >
                      {saving === r.id ? 'Saving…' : 'Save'}
                    </button>
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
