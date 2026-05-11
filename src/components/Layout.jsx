import { useEffect, useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useQuery } from '@apollo/client'
import { useAuth } from '../context/AuthContext.jsx'
import { GET_CART_ITEMS } from '../graphql/operations.js'
import GlobalCartBar from './GlobalCartBar.jsx'
import MobileBottomNav from './MobileBottomNav.jsx'

export default function Layout({ children }) {
  const { session, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const isOwner = session?.role === 'OWNER'

  const [search, setSearch] = useState('')

  // Sync search input with URL ?q= when on home.
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    setSearch(params.get('q') || '')
  }, [location.search])

  // Cart count for the icon badge.
  const cartId = session?.cartId
  const { data: cartData } = useQuery(GET_CART_ITEMS, {
    variables: { params: { cartId } },
    skip: !cartId,
    fetchPolicy: 'cache-and-network',
  })
  const cartCount = cartData?.getCartItems?.__typename === 'CartItemsType'
    ? cartData.getCartItems.cartItems.reduce((s, c) => s + c.quantity, 0)
    : 0

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const submitSearch = (e) => {
    e.preventDefault()
    navigate('/?q=' + encodeURIComponent(search))
  }

  return (
    <div>
      <nav className="nav">
        <div className="nav-inner">
          <div className="brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            <span className="brand-dot">Z</span>
            zomato
          </div>

          {!isOwner && (
            <form className="nav-search" onSubmit={submitSearch}>
              <span className="nav-search-icon">🔍</span>
              <input
                className="input"
                placeholder="Search restaurants…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </form>
          )}

          <div className="nav-links">
            <NavLink to="/" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')} end>
              Home
            </NavLink>
            {!isOwner && (
              <>
                <NavLink to="/orders" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
                  Orders
                </NavLink>
                <NavLink to="/addresses" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
                  Addresses
                </NavLink>
                <div className="nav-cart" onClick={() => navigate('/cart')}>
                  <span style={{ fontSize: 16 }}>🛒</span>
                  Cart
                  {cartCount > 0 && <span className="badge">{cartCount}</span>}
                </div>
              </>
            )}
            {isOwner && (
              <NavLink to="/owner" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
                Owner
              </NavLink>
            )}
            {session && (
              <span className="nav-user">
                {session.name || session.userId?.slice(0, 8)}
                {session.role && <span className={'role-pill ' + session.role}>{session.role}</span>}
              </span>
            )}
            <button className="btn subtle sm" onClick={handleLogout}>Logout</button>
          </div>
        </div>
      </nav>
      
      <div className="mobile-content-wrapper">
        <main className="container">{children}</main>
      </div>
      
      {/* Mobile bottom navigation - only show for customers on mobile */}
      {!isOwner && <MobileBottomNav />}
      
      <GlobalCartBar />
    </div>
  )
}
