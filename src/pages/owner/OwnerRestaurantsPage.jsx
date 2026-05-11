import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@apollo/client'
import {
  GET_OWNER_RESTAURANTS,
} from '../../graphql/operations.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { titleCase } from '../../lib/format.js'
import { cuisineEmoji } from '../../lib/restaurantUI.js'

export default function OwnerRestaurantsPage() {
  const navigate = useNavigate()
  const { session, logout } = useAuth()

  const { data: ownerData, loading: ownerLoading, error: ownerError } = useQuery(GET_OWNER_RESTAURANTS, {
    skip: !session?.userId,
    fetchPolicy: 'cache-and-network',
  })

  const ownedRestaurants = useMemo(() => {
    const list = ownerData?.getOwnerRestaurants
    if (list?.__typename !== 'OwnerRestaurantsType') return []
    return list.restaurants
  }, [ownerData])

  const handleLogout = () => { logout(); navigate('/login') }

  const initial = (session?.name || 'O').slice(0, 1).toUpperCase()
  const loadingFirstTime = ownerLoading
  const isEmpty = !ownerLoading && ownedRestaurants.length === 0

  // Show error if there is one
  if (ownerError) {
    return (
      <div style={{ minHeight: '100vh', background: '#f6f7f9', padding: '40px' }}>
        <div className="card card-pad" style={{ maxWidth: 520, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>❌</div>
          <h2 style={{ margin: '0 0 8px', color: 'var(--text-strong)' }}>
            Error loading restaurants
          </h2>
          <p style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.5 }}>
            {ownerError.message}
          </p>
          <button 
            className="btn" 
            style={{ marginTop: 16 }}
            onClick={() => window.location.reload()}
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f6f7f9' }}>
      <header style={{
        background: '#fff',
        borderBottom: '1px solid var(--border-soft)',
        padding: '14px 28px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'var(--brand)', color: '#fff',
          display: 'grid', placeItems: 'center',
          fontWeight: 900, fontSize: 18,
        }}>Z</div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 800, color: 'var(--text-strong)', fontSize: 16 }}>
            Owner dashboard
          </div>
          <div style={{ color: 'var(--muted)', fontSize: 12 }}>
            Pick a restaurant to manage
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'var(--brand-tint)', color: 'var(--brand)',
            display: 'grid', placeItems: 'center',
            fontWeight: 800, fontSize: 14,
          }}>{initial}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-strong)' }}>
              {session?.name || 'Owner'}
            </div>
            <div style={{ color: 'var(--muted)', fontSize: 11 }}>Owner account</div>
          </div>
          <button className="btn subtle sm" onClick={handleLogout}>Sign out</button>
        </div>
      </header>

      <main style={{ maxWidth: 1180, margin: '0 auto', padding: '28px 24px 64px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 18 }}>
          <h1 style={{ margin: 0, color: 'var(--text-strong)', fontSize: 24 }}>
            Your restaurants
          </h1>
          <span style={{ color: 'var(--muted)', fontWeight: 500, fontSize: 14 }}>
            ({loadingFirstTime ? '…' : ownedRestaurants.length})
          </span>
        </div>

        {loadingFirstTime && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 14, padding: '60px 0',
          }}>
            <span className="spinner" />
            <div style={{ color: 'var(--muted)', fontSize: 13, fontWeight: 600 }}>
              Loading your restaurants…
            </div>
          </div>
        )}

        {isEmpty && (
          <div className="card card-pad" style={{ maxWidth: 520, margin: '40px auto', textAlign: 'center' }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>🏪</div>
            <h2 style={{ margin: '0 0 8px', color: 'var(--text-strong)' }}>
              No restaurants assigned
            </h2>
            <p style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.5 }}>
              Your account doesn't have any restaurants linked yet. Please contact
              admin to get one assigned.
            </p>
          </div>
        )}

        {!loadingFirstTime && ownedRestaurants.length > 0 && (
          <div className="grid">
            {ownedRestaurants.map((r) => (
              <OwnerRestaurantCard
                key={r.restaurantId}
                r={r}
                onClick={() => navigate(`/owner/${r.restaurantId}`)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function OwnerRestaurantCard({ r, onClick }) {
  const cuisineKey = r.cuisineType?.toLowerCase()
  return (
    <div className="r-card" onClick={onClick}>
      <div className="r-card-banner-wrap">
        <div className={'r-banner ' + (r.isVegOnly ? 'veg ' : '') + cuisineKey}>
          <span>{cuisineEmoji(r.cuisineType)}</span>
          <div className="r-time-overlay">
            <span style={{
              background: 'rgba(96,178,70,0.92)',
              color: '#fff',
              padding: '3px 8px',
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: 0.4,
            }}>
              MANAGE
            </span>
          </div>
        </div>
      </div>
      <div className="r-body">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <h3 className="r-name">{r.name}</h3>
          <span className="rating-pill">Owner</span>
        </div>
        <div className="r-meta-row">
          <span style={{ color: 'var(--text)', fontSize: 13 }}>{titleCase(r.cuisineType)}</span>
          <span className="dot-sep">·</span>
          <span>{r.address?.split(' ').slice(-2).join(' ')}</span>
        </div>
        <div className="r-meta-row" style={{ marginTop: 2 }}>
          <span>📍 {r.pinCode}</span>
          {r.isVegOnly && (
            <>
              <span className="dot-sep">·</span>
              <span className="veg-pill">PURE VEG</span>
            </>
          )}
        </div>
        <button
          className="btn block"
          style={{ marginTop: 14 }}
          onClick={(e) => { e.stopPropagation(); onClick() }}
        >
          Manage →
        </button>
      </div>
    </div>
  )
}
