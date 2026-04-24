/** Matches backend `restaurant.services.ALLOWED_STATUS_TRANSITIONS`. */
export const nextOrderStatuses = (current) => {
  const map = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['preparing', 'cancelled'],
    preparing: ['ready', 'cancelled'],
    ready: ['served', 'cancelled'],
    served: [],
    cancelled: [],
  }
  return map[current] ?? []
}

const labels = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  ready: 'Ready',
  served: 'Served',
  cancelled: 'Cancelled',
}

export const statusLabel = (s) => labels[s] ?? s

/** CSS modifier for `.status-pill` */
export const statusPillClass = (s) => {
  const tone = {
    pending: 'status-pill--pending',
    confirmed: 'status-pill--confirmed',
    preparing: 'status-pill--preparing',
    ready: 'status-pill--ready',
    served: 'status-pill--served',
    cancelled: 'status-pill--cancelled',
  }
  return tone[s] ?? ''
}
