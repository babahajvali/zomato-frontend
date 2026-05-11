import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useQuery } from '@apollo/client'
import { GET_CART_ITEMS } from '../graphql/operations.js'

export default function MobileBottomNav() {
  const { session } = useAuth()
  const location = useLocation()

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

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/' || location.pathname === '/restaurants'
    }
    return location.pathname.startsWith(path)
  }

  return (
    <nav className="mobile-bottom-nav">
      <NavLink 
        to="/" 
        className={`mobile-bottom-nav-item ${isActive('/') ? 'active' : ''}`}
      >
        <span className="mobile-nav-icon">🏠</span>
        <span className="mobile-nav-label">Home</span>
      </NavLink>
      
      <NavLink 
        to="/orders" 
        className={`mobile-bottom-nav-item ${isActive('/orders') ? 'active' : ''}`}
      >
        <span className="mobile-nav-icon">📦</span>
        <span className="mobile-nav-label">Orders</span>
      </NavLink>
      
      <NavLink 
        to="/cart" 
        className={`mobile-bottom-nav-item ${isActive('/cart') ? 'active' : ''}`}
      >
        <span className="mobile-nav-icon">🛒</span>
        <span className="mobile-nav-label">Cart</span>
        {cartCount > 0 && (
          <span className="mobile-nav-badge">{cartCount > 99 ? '99+' : cartCount}</span>
        )}
      </NavLink>
      
      <NavLink 
        to="/profile" 
        className={`mobile-bottom-nav-item ${isActive('/profile') ? 'active' : ''}`}
      >
        <span className="mobile-nav-icon">👤</span>
        <span className="mobile-nav-label">Profile</span>
      </NavLink>
    </nav>
  )
}
