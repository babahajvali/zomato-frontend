import { useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@apollo/client'
import {
  BROWSE_RESTAURANTS,
  GET_RESTAURANT_TIMINGS,
  TODAY_RESTAURANT_ORDERS,
  TODAY_RESTAURANT_SCHEDULED_ORDERS,
} from '../../graphql/operations.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { titleCase } from '../../lib/format.js'

const MAIN_NAV = [
  { to: '',            label: 'Overview',         icon: '📊', end: true },
  { to: 'live',        label: 'Live orders',      icon: '🔔' },
  { to: 'scheduled',   label: 'Scheduled orders', icon: '📅' },
]

const OTHER_NAV = [
  { to: 'menu',        label: 'Menu',             icon: '🍽️' },
  { to: 'timings',     label: 'Timings',          icon: '🕒' },
]

export default function OwnerShell() {
  const { restaurantId } = useParams()
  const navigate = useNavigate()
  const { session, logout } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [isNavExpanded, setIsNavExpanded] = useState(false) // false = collapsed, true = expanded

  const { data: timingsData } = useQuery(GET_RESTAURANT_TIMINGS, {
    variables: { params: { restaurantId } },
    fetchPolicy: 'cache-and-network',
  })

  useEffect(() => {
    const list = timingsData?.getRestaurantTimings
    if (list?.__typename !== 'RestaurantTimingsListType') return
    const now = new Date()
    const jsDay = now.getDay()
    const todayDow = jsDay === 0 ? 7 : jsDay
    const todayTiming = list.timings.find((t) => t.dayOfWeek === todayDow)
    if (!todayTiming) {
      setIsOpen(false)
      return
    }
    const pad = (n) => String(n).padStart(2, '0')
    const nowStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
    setIsOpen(nowStr >= todayTiming.openTime && nowStr < todayTiming.closeTime)
  }, [timingsData])

  const { data: brData } = useQuery(BROWSE_RESTAURANTS, {
    variables: { params: { limit: 100, offset: 0 } },
    fetchPolicy: 'cache-first',
  })
  const restaurant = useMemo(() => {
    const list = brData?.browseRestaurants
    if (list?.__typename !== 'BrowseRestaurantsType') return null
    return list.restaurants.find((r) => r.restaurantId === restaurantId) || null
  }, [brData, restaurantId])

  // Pending count for the bell.
  const { data: tData } = useQuery(TODAY_RESTAURANT_ORDERS, {
    variables: { params: { restaurantId, limit: 50, offset: 0 } },
    fetchPolicy: 'cache-and-network',
    pollInterval: 60000,
  })
  const pending = tData?.todayRestaurantOrders?.__typename === 'OrdersType'
    ? tData.todayRestaurantOrders.orders.filter((o) => o.status === 'PLACED').length
    : 0

  const { data: schedData } = useQuery(TODAY_RESTAURANT_SCHEDULED_ORDERS, {
    variables: { params: { restaurantId, limit: 50, offset: 0 } },
    fetchPolicy: 'cache-and-network',
    pollInterval: 60000,
  })
  const scheduledPending = schedData?.todayRestaurantScheduledOrders?.__typename === 'ScheduledOrderSummariesType'
    ? schedData.todayRestaurantScheduledOrders.orderSummaries.filter((o) => o.status === 'PLACED').length
    : 0

  const handleLogout = () => { logout(); navigate('/login') }

  const initial = (session?.name || 'O').slice(0, 1).toUpperCase()

  return (
    <div className={'owner-shell' + (collapsed ? ' collapsed' : '')}>
      <aside className="owner-sidebar">
        <button className="os-collapse" onClick={() => setCollapsed((c) => !c)} title={collapsed ? 'Expand' : 'Collapse'}>
          {collapsed ? '›' : '‹'}
        </button>
        <div className="os-brand" onClick={() => navigate(`/owner/${restaurantId}`)} style={{ cursor: 'pointer' }}>
          <span className="brand-dot">Z</span>
          <span className="os-label">zomato</span>
        </div>

        <div className="os-foot">
          <div className="os-user">
            <div className="os-avatar">{initial}</div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="os-user-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {session?.name || 'Owner'}
              </div>
              <div className="os-user-role">Owner account</div>
            </div>
            <button className="btn subtle sm" onClick={handleLogout} title="Sign out">⏻</button>
          </div>
        </div>
      </aside>

      {/* Mobile Navigation Bar - Outside sidebar */}
      <div className="owner-nav-bar">
        {MAIN_NAV.map((item) => (
          <NavLink
            key={item.label}
            to={item.to ? `/owner/${restaurantId}/${item.to}` : `/owner/${restaurantId}`}
            end={item.end}
            className={({ isActive }) => 'owner-nav-item' + (isActive ? ' active' : '')}
          >
            <span className="owner-nav-icon">{item.icon}</span>
            <span className="owner-nav-label">{item.label}</span>
            {item.label === 'Live orders' && pending > 0 && (
              <span className="owner-nav-badge">{pending}</span>
            )}
            {item.label === 'Scheduled orders' && scheduledPending > 0 && (
              <span className="owner-nav-badge">{scheduledPending}</span>
            )}
          </NavLink>
        ))}
        
        <button 
          className="owner-nav-more"
          onClick={() => setIsNavExpanded(!isNavExpanded)}
        >
          <span className="owner-nav-more-icon">{isNavExpanded ? '✕' : '⋯'}</span>
        </button>
      </div>

      {/* Expanded Navigation */}
      {isNavExpanded && (
        <div className="owner-nav-expanded">
          <NavLink to="/owner" end className="owner-nav-item">
            <span className="owner-nav-icon">🏬</span>
            <span className="owner-nav-label">All restaurants</span>
          </NavLink>
          {OTHER_NAV.map((item) => (
            <NavLink
              key={item.label}
              to={item.to ? `/owner/${restaurantId}/${item.to}` : `/owner/${restaurantId}`}
              end={item.end}
              className={({ isActive }) => 'owner-nav-item' + (isActive ? ' active' : '')}
            >
              <span className="owner-nav-icon">{item.icon}</span>
              <span className="owner-nav-label">{item.label}</span>
            </NavLink>
          ))}
        </div>
      )}
      
      
      <main className="owner-main">
        <header className="owner-header">
          <div>
            <h1>{restaurant?.name || 'Restaurant'}</h1>
            <div className="sub">
              {restaurant ? (
                <>{titleCase(restaurant.cuisineType)} · {restaurant.address}</>
              ) : 'Loading…'}
            </div>
          </div>
          <div className="spacer" />

          <div
            className={'status-toggle ' + (isOpen ? 'open' : 'closed')}
            onClick={() => setIsOpen((v) => !v)}
            title="Toggle store availability (visual only)"
          >
            <span className="dot" />
            {isOpen ? 'Open' : 'Closed'}
          </div>

          <div className="bell" title={`${pending} pending order${pending === 1 ? '' : 's'}`}>
            🔔
            {pending > 0 && <span className="badge">{pending}</span>}
          </div>
        </header>

        <div className="owner-content">
          <Outlet context={{ restaurant, pending }} />
        </div>
      </main>
    </div>
  )
}
