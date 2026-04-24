import { useState } from 'react'

/**
 * Dish photo with a tasteful placeholder when no image or load fails.
 * `card` — wide hero for menu grid. `thumb` — compact square for forms / tables.
 */
export default function MenuItemMedia({ imageUrl, name, variant = 'card' }) {
  const [failed, setFailed] = useState(false)
  const showImg = Boolean(imageUrl) && !failed

  if (variant === 'thumb') {
    return (
      <div className="menu-thumb" title={name}>
        {showImg ? (
          <img
            className="menu-thumb__img"
            src={imageUrl}
            alt=""
            loading="lazy"
            decoding="async"
            onError={() => setFailed(true)}
          />
        ) : null}
        <div className={`menu-thumb__ph ${showImg ? 'menu-thumb__ph--hidden' : ''}`} aria-hidden="true">
          🍽
        </div>
      </div>
    )
  }

  return (
    <div className="menu-card__media">
      {showImg ? (
        <img
          className="menu-card__media__img"
          src={imageUrl}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : null}
      <div className={`menu-card__media__ph ${showImg ? 'menu-card__media__ph--hidden' : ''}`} aria-hidden="true">
        <span className="menu-card__media__ph-icon">🍽</span>
        <span className="menu-card__media__ph-label">{name}</span>
      </div>
    </div>
  )
}
