import { useEffect, useState } from 'react'
import { NavLink, Route, Routes, useLocation } from 'react-router-dom'
import './App.css'
import MenuPage from './pages/MenuPage.jsx'
import OrdersPage from './pages/OrdersPage.jsx'
import OrderDetailPage from './pages/OrderDetailPage.jsx'
import PlaceOrderPage from './pages/PlaceOrderPage.jsx'
import ReservationsPage from './pages/ReservationsPage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'

const nav = [
  { to: '/', label: 'Menu', end: true },
  { to: '/place-order', label: 'Place order' },
  { to: '/orders', label: 'Orders' },
  { to: '/reservations', label: 'Reservations' },
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

function ThemeIcon({ theme }) {
  if (theme === 'light') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    )
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M21 14.2A9 9 0 1 1 9.8 3a7 7 0 1 0 11.2 11.2Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function App() {
  const [navOpen, setNavOpen] = useState(false)
  const [theme, setTheme] = useState('dark')
  const location = useLocation()

  useEffect(() => {
    const stored = window.localStorage.getItem('rms-theme')
    if (stored === 'light' || stored === 'dark') {
      setTheme(stored)
      return
    }
    const prefersLight = window.matchMedia?.('(prefers-color-scheme: light)').matches
    setTheme(prefersLight ? 'light' : 'dark')
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    window.localStorage.setItem('rms-theme', theme)
  }, [theme])

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
          <button
            type="button"
            className="theme-toggle"
            onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            <ThemeIcon theme={theme} />
            <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
          </button>
          <p></p>
        </div>
      </aside>

      <div className="main-wrap">
        <header className="mobile-bar">
          <span className="mobile-bar__brand">RMS</span>
          <div className="mobile-bar__actions">
            <button
              type="button"
              className="theme-toggle theme-toggle--mobile"
              onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              <ThemeIcon theme={theme} />
            </button>
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
          </div>
        </header>

        <main id="main-content" className="main">
          <Routes>
            <Route path="/" element={<MenuPage />} />
            <Route path="/place-order" element={<PlaceOrderPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/orders/:id" element={<OrderDetailPage />} />
            <Route path="/reservations" element={<ReservationsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
