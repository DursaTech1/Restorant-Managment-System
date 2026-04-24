import { useEffect, useState } from 'react'
import { NavLink, Route, Routes, useLocation } from 'react-router-dom'
import './App.css'
import MenuPage from './pages/MenuPage.jsx'
import OrdersPage from './pages/OrdersPage.jsx'
import OrderDetailPage from './pages/OrderDetailPage.jsx'
import PlaceOrderPage from './pages/PlaceOrderPage.jsx'
import ReservationsPage from './pages/ReservationsPage.jsx'
import InventoryPage from './pages/InventoryPage.jsx'
import ReportsPage from './pages/ReportsPage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'

const nav = [
  { to: '/', label: 'Menu', end: true },
  { to: '/place-order', label: 'Place order' },
  { to: '/orders', label: 'Orders' },
  { to: '/reservations', label: 'Reservations' },
  { to: '/inventory', label: 'Inventory' },
  { to: '/reports', label: 'Reports' },
]

function MenuIcon({ open }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <path
        d={open ? 'M4 4L18 18M18 4L4 18' : 'M4 6h14M4 11h14M4 16h14'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

export default function App() {
  const [navOpen, setNavOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setNavOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!navOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') setNavOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navOpen])

  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>

      <div
        className={`sidebar-backdrop ${navOpen ? 'is-open' : ''}`}
        aria-hidden="true"
        onClick={() => setNavOpen(false)}
      />

      <aside id="sidebar-nav" className={`sidebar ${navOpen ? 'is-open' : ''}`} aria-label="Main navigation">
        <div className="brand">
          RMS
          <span>Restaurant</span>
        </div>
        <nav>
          {nav.map(({ to, label, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => (isActive ? 'active' : undefined)}>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar__foot">
          Service runs against your Django API. Start the backend on port 8000 for live data.
        </div>
      </aside>

      <div className="main-wrap">
        <header className="mobile-bar">
          <span className="mobile-bar__brand">RMS</span>
          <button
            type="button"
            className="menu-toggle"
            aria-expanded={navOpen}
            aria-controls="sidebar-nav"
            onClick={() => setNavOpen((o) => !o)}
          >
            <span className="visually-hidden">{navOpen ? 'Close menu' : 'Open menu'}</span>
            <MenuIcon open={navOpen} />
          </button>
        </header>

        <main id="main-content" className="main">
          <Routes>
            <Route path="/" element={<MenuPage />} />
            <Route path="/place-order" element={<PlaceOrderPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/orders/:id" element={<OrderDetailPage />} />
            <Route path="/reservations" element={<ReservationsPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
