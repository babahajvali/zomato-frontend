import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@apollo/client'
import { useNavigate, useLocation } from 'react-router-dom'
import { BROWSE_RESTAURANTS } from '../graphql/operations.js'
import { titleCase } from '../lib/format.js'
import { useAuth } from '../context/AuthContext.jsx'
import {
  CUISINES,
  cuisineEmoji,
  deliveryMinutes,
  minOrder,
  priceForTwo,
} from '../lib/restaurantUI.js'

const EMPTY = { cuisineType: '', isVegOnly: false, pincode: '', minRating: '', search: '' }

export default function RestaurantsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { session } = useAuth()
  const [draft, setDraft] = useState(EMPTY)
  const [applied, setApplied] = useState(EMPTY)

  // Hydrate ?q= from the global search bar in Layout
  useEffect(() => {
    const q = new URLSearchParams(location.search).get('q') || ''
    if (q !== applied.search) {
      const next = { ...applied, search: q }
      setDraft(next)
      setApplied(next)
    }
  }, [location.search]) // eslint-disable-line

  const variables = useMemo(() => ({
    params: {
      cuisineType: applied.cuisineType || null,
      isVegOnly: applied.isVegOnly || null,
      pincode: applied.pincode || null,
      minRating: applied.minRating ? Number(applied.minRating) : null,
      search: applied.search || null,
      limit: 50,
      offset: 0,
    },
  }), [applied])

  const { data, loading, error } = useQuery(BROWSE_RESTAURANTS, { variables })
  const result = data?.browseRestaurants
  const restaurants = result?.__typename === 'BrowseRestaurantsType' ? result.restaurants : []

  const apply = (e) => { e?.preventDefault?.(); setApplied(draft) }

  const pickCuisine = (val) => {
    const next = { ...draft, cuisineType: val }
    setDraft(next)
    setApplied(next)
  }

  return (
    <>
      {/* Hero with category carousel */}
      <section className="hero-banner">
        <h1>Hey {session?.name?.split(' ')[0] || 'there'} 👋</h1>
        <p>What's on your mind today? Pick a craving — we'll bring it to your door fast.</p>

        <div className="category-carousel">
          {CUISINES.map((c) => {
            const active = applied.cuisineType === c.value
            return (
              <div
                key={c.value || 'all'}
                className={'category-tile' + (active ? ' active' : '')}
                onClick={() => pickCuisine(c.value)}
              >
                <div className="ct-icon" style={{ background: c.tint }}>{c.emoji}</div>
                <div className="ct-label">{c.label}</div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Inline filter bar: Pure Veg + Pincode + Min Rating + Apply / Reset */}
      <form className="filter-bar" onSubmit={apply}>
        <button
          type="button"
          className={'fb-pill' + (draft.isVegOnly ? ' active' : '')}
          onClick={() => {
            const next = { ...draft, isVegOnly: !draft.isVegOnly }
            setDraft(next)
            setApplied(next)
          }}
        >
          <span className="veg-mark" /> Pure Veg
        </button>

        <input
          className="fb-input"
          placeholder="Pincode"
          value={draft.pincode}
          onChange={(e) => setDraft((f) => ({ ...f, pincode: e.target.value }))}
        />

        <select
          className="fb-input fb-select"
          value={draft.minRating}
          onChange={(e) => setDraft((f) => ({ ...f, minRating: e.target.value }))}
        >
          <option value="">Any rating</option>
          <option value="3">★ 3.0+</option>
          <option value="3.5">★ 3.5+</option>
          <option value="4">★ 4.0+</option>
          <option value="4.5">★ 4.5+</option>
        </select>

        <button className="fb-btn primary" type="submit" disabled={loading}>
          {loading ? 'Searching…' : 'Apply'}
        </button>
        <button
          className="fb-btn"
          type="button"
          onClick={() => { setDraft(EMPTY); setApplied(EMPTY) }}
        >
          Reset
        </button>
      </form>

      {/* Listing */}
      <h2 className="section-title">
        {applied.cuisineType ? `${titleCase(applied.cuisineType)} restaurants` : 'Restaurants near you'}
        <span style={{ color: 'var(--muted)', fontWeight: 500, fontSize: 14, marginLeft: 8 }}>
          ({loading ? '…' : restaurants.length})
        </span>
      </h2>

      {error && <div className="errbox">Failed to load restaurants: {error.message}</div>}
      {result && result.__typename !== 'BrowseRestaurantsType' && (
        <div className="errbox">Filter rejected: {result.__typename}</div>
      )}

      {!loading && restaurants.length === 0 && (
        <div className="empty">
          <div className="emoji">🍴</div>
          <div className="empty-title">No restaurants match these filters</div>
          <div>Try widening your search.</div>
        </div>
      )}

      <div className="grid">
        {restaurants.map((r) => (
          <RestaurantCard
            key={r.restaurantId}
            r={r}
            onClick={() => navigate(`/restaurants/${r.restaurantId}`)}
          />
        ))}
      </div>
    </>
  )
}

function RestaurantCard({ r, onClick }) {
  const cuisineKey = r.cuisineType?.toLowerCase()
  const dt = deliveryMinutes(r.restaurantId)
  const minOrd = minOrder(r.restaurantId)
  const p2 = priceForTwo(r.restaurantId)
  const showTopRated = r.totalReviews >= 5 && r.averageRating >= 4

  return (
    <div className="r-card" onClick={onClick}>
      <div className="r-card-banner-wrap">
        <div className={
          'r-banner ' +
          (r.isVegOnly ? 'veg ' : '') +
          cuisineKey +
          (r.isOpen ? '' : ' closed')
        }>
          <span>{cuisineEmoji(r.cuisineType)}</span>
          {showTopRated && <span className="r-promo">⭐ TOP RATED</span>}
          {/*{r.isOpen && (*/}
          {/*  <div className="r-time-overlay">*/}
          {/*    <span>{dt} min</span>*/}
          {/*    <span style={{ fontSize: 12, opacity: 0.92 }}>Min ₹{minOrd}</span>*/}
          {/*  </div>*/}
          {/*)}*/}
        </div>
      </div>

      <div className="r-body">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <h3 className="r-name">{r.name}</h3>
          {r.totalReviews > 0 ? (
            <span className="rating-pill">★ {r.averageRating.toFixed(1)}</span>
          ) : (
            <span className="rating-pill muted">New</span>
          )}
        </div>
        <div className="r-meta-row">
          <span style={{ color: 'var(--text)', fontSize: 13 }}>{titleCase(r.cuisineType)}</span>
          <span className="dot-sep">·</span>
          <span>{r.address?.split(' ').slice(-2).join(' ')}</span>
        </div>
        <div className="r-meta-row" style={{ marginTop: 2 }}>
          <span>📍 {r.pinCode}</span>
          <span className="dot-sep">·</span>
        </div>
        {r.isVegOnly && (
          <div style={{ marginTop: 8 }}>
            <span className="veg-pill">PURE VEG</span>
          </div>
        )}
      </div>
    </div>
  )
}
