import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@apollo/client'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  BROWSE_RESTAURANTS,
  GET_USER_RECOMMENDED_RESTAURANTS,
  GET_USER_ADDRESSES,
} from '../graphql/operations.js'
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
const DEFAULT_RECOMMENDATION_PINCODE = '500034'
const RECOMMENDATION_LIMIT = 8

export default function RestaurantsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { session } = useAuth()
  const [draft, setDraft] = useState(EMPTY)
  const [applied, setApplied] = useState(EMPTY)
  const [selectedAddressId, setSelectedAddressId] = useState(null)

  // Hydrate ?q= from the global search bar in Layout
  useEffect(() => {
    const q = new URLSearchParams(location.search).get('q') || ''
    if (q !== applied.search) {
      const next = { ...applied, search: q }
      setDraft(next)
      setApplied(next)
    }
  }, [location.search]) // eslint-disable-line

  // ── Addresses ─────────────────────────────────────────────
  const { data: addressesData, loading: addressesLoading } = useQuery(
    GET_USER_ADDRESSES,
    { skip: !session?.token }
  )
  const addresses = addressesData?.getUserAddresses?.__typename === 'UserAddressesType'
    ? addressesData.getUserAddresses.addresses
    : []

  // Pick a sensible default once addresses arrive (default flag first, else first item)
  useEffect(() => {
    if (selectedAddressId || addresses.length === 0) return
    const pick = addresses.find((a) => a.isDefault) || addresses[0]
    if (pick) setSelectedAddressId(pick.addressId)
  }, [addresses, selectedAddressId])

  const selectedAddress = useMemo(
    () => addresses.find((a) => a.addressId === selectedAddressId) || null,
    [addresses, selectedAddressId]
  )
  const selectedPincode = selectedAddress?.pincode || ''

  // ── Filters ───────────────────────────────────────────────
  // The two pincodes are completely separate, by design:
  //   • selectedPincode  → ONLY feeds getUserRecommendedRestaurants
  //   • applied.pincode  → ONLY feeds browseRestaurants (from filter bar)
  // They never cross over.
  const hasFilters = Boolean(
    applied.cuisineType ||
    applied.isVegOnly ||
    applied.minRating ||
    applied.search
  )

  const browseVariables = useMemo(() => ({
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

  // ── Queries: exactly ONE runs at a time ───────────────────
  const { data: browseData, loading: browseLoading, error: browseError } = useQuery(
    BROWSE_RESTAURANTS,
    {
      variables: browseVariables,
      skip: !hasFilters,
    }
  )

  const { data: recoData, loading: recoLoading } = useQuery(
    GET_USER_RECOMMENDED_RESTAURANTS,
    {
      variables: {
        params: {
          pincode: selectedPincode || DEFAULT_RECOMMENDATION_PINCODE,
          limit: RECOMMENDATION_LIMIT,
          offset: 0,
        },
      },
      skip: hasFilters || !selectedPincode,
    }
  )

  const browseResult = browseData?.browseRestaurants
  const restaurants = browseResult?.__typename === 'BrowseRestaurantsType'
    ? browseResult.restaurants
    : []

  const recoResult = recoData?.getUserRecommendedRestaurants
  const recommendedRestaurants = recoResult?.__typename === 'ScoredRestaurantsType'
    ? recoResult.restaurants
    : []

  const apply = (e) => { e?.preventDefault?.(); setApplied(draft) }

  const pickCuisine = (val) => {
    const next = { ...draft, cuisineType: val }
    setDraft(next)
    setApplied(next)
  }

  const hasAddresses = addresses.length > 0
  const showAddressEmptyCTA = !!session?.token && !addressesLoading && !hasAddresses

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

      {/* Address pill selector */}
      {hasAddresses && (
        <section className="address-strip-section">
          <div className="address-strip-label">Deliver to</div>
          <div className="address-strip">
            {addresses.map((a) => {
              const active = a.addressId === selectedAddressId
              return (
                <button
                  key={a.addressId}
                  type="button"
                  className={'address-pill' + (active ? ' active' : '')}
                  onClick={() => setSelectedAddressId(a.addressId)}
                  title={a.fullAddress}
                >
                  <span className="address-pill-icon" aria-hidden>📍</span>
                  <span className="address-pill-text">
                    <span className="address-pill-label">{a.label}</span>
                    <span className="address-pill-pin">{a.city ? `${a.city} · ` : ''}{a.pincode}</span>
                  </span>
                  {a.isDefault && <span className="address-pill-default">Default</span>}
                </button>
              )
            })}
          </div>
        </section>
      )}

      {showAddressEmptyCTA && (
        <div className="address-empty-cta">
          <div className="address-empty-icon" aria-hidden>🏠</div>
          <div className="address-empty-text">
            <div className="address-empty-title">Add a delivery address</div>
            <div className="address-empty-sub">
              Add a delivery address to see restaurants near you
            </div>
          </div>
          <button
            type="button"
            className="btn"
            onClick={() => navigate('/addresses')}
          >
            Add Address
          </button>
        </div>
      )}

      {/* Inline filter bar */}
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

        <button className="fb-btn primary" type="submit" disabled={browseLoading}>
          {browseLoading ? 'Searching…' : 'Apply'}
        </button>
        <button
          className="fb-btn"
          type="button"
          onClick={() => { setDraft(EMPTY); setApplied(EMPTY) }}
        >
          Reset
        </button>
      </form>

      {/* ── ONE section renders at a time ────────────────────── */}

      {!hasFilters ? (
        /* Recommended For You — horizontal carousel */
        <section className="reco-section">
          <div className="reco-header">
            <div>
              <h2 className="reco-title">Recommended for You 🍽️</h2>
              <p className="reco-subtitle">
                Based on your order history
                {selectedAddress?.label && ` · ${selectedAddress.label}`}
              </p>
            </div>
          </div>

          {recoLoading ? (
            <div className="grid">
              {[0, 1, 2, 3].map((i) => (
                <div className="r-card" key={i}>
                  <div className="r-banner skeleton" />
                  <div className="r-body">
                    <div className="skeleton" style={{ height: 16, marginBottom: 8 }} />
                    <div className="skeleton" style={{ height: 12, width: '60%', marginBottom: 10 }} />
                    <div className="skeleton" style={{ height: 22, width: '40%' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : recommendedRestaurants.length === 0 ? (
            <div className="reco-empty">
              <span className="reco-empty-icon" aria-hidden>🍽️</span>
              <div>
                <div className="reco-empty-title">No recommendations yet</div>
                <div className="reco-empty-sub">
                  Place your first order to get personalized recommendations!
                </div>
              </div>
            </div>
          ) : (
            <div className="grid">
              {recommendedRestaurants.map((r) => (
                <RestaurantCard
                  key={r.restaurantId}
                  r={{ ...r, pinCode: r.pinCode ?? r.pincode }}
                  onClick={() => navigate(`/restaurants/${r.restaurantId}`)}
                />
              ))}
            </div>
          )}
        </section>
      ) : (
        /* Filtered: Restaurants near you */
        <>
          <h2 className="section-title">
            {applied.cuisineType
              ? `${titleCase(applied.cuisineType)} restaurants`
              : 'Restaurants near you'}
            <span style={{ color: 'var(--muted)', fontWeight: 500, fontSize: 14, marginLeft: 8 }}>
              ({browseLoading ? '…' : restaurants.length})
            </span>
          </h2>

          {browseError && (
            <div className="errbox">Failed to load restaurants: {browseError.message}</div>
          )}
          {browseResult && browseResult.__typename !== 'BrowseRestaurantsType' && (
            <div className="errbox">Filter rejected: {browseResult.__typename}</div>
          )}

          {!browseLoading && restaurants.length === 0 && (
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
      )}
    </>
  )
}

function RestaurantCard({ r, onClick }) {
  const cuisineKey = r.cuisineType?.toLowerCase()
  const dt = deliveryMinutes(r.restaurantId)
  const minOrd = minOrder(r.restaurantId)
  const p2 = priceForTwo(r.restaurantId)
  const averageRating = Number(r.averageRating || 0)
  const showTopRated = r.totalReviews >= 5 && averageRating >= 4

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
        </div>
      </div>

      <div className="r-body">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <h3 className="r-name">{r.name}</h3>
          {r.totalReviews > 0 ? (
            <span className="rating-pill">★ {averageRating.toFixed(1)}</span>
          ) : (
            <span className="rating-pill muted">New</span>
          )}
        </div>
        <div className="r-meta-row">
          <span style={{ color: 'var(--text)', fontSize: 13 }}>{titleCase(r.cuisineType)}</span>
          {r.address && <span className="dot-sep">·</span>}
          {r.address && <span>{r.address.split(' ').slice(-2).join(' ')}</span>}
        </div>
        <div className="r-meta-row" style={{ marginTop: 2 }}>
          {r.pinCode && <span>📍 {r.pinCode}</span>}
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
