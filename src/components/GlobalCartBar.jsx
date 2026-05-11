import React from 'react'
import { useQuery } from '@apollo/client'
import { useNavigate, useLocation } from 'react-router-dom'
import { GET_CART_ITEMS } from '../graphql/operations.js'
import { useAuth } from '../context/AuthContext.jsx'
import { inr } from '../lib/format.js'
import { ensureCartId } from '../lib/cart.js'

export default function GlobalCartBar() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  
  // Try to get cart ID dynamically if not in session
  const [cartId, setCartId] = React.useState(session?.cartId || null)
  
  React.useEffect(() => {
    // Reset cart ID when session changes
    if (session?.cartId) {
      setCartId(session.cartId)
    } else if (session?.role === 'CUSTOMER') {
      // Fetch cart ID if customer but no cartId in session
      ensureCartId().then(fetchedCartId => {
        if (fetchedCartId) {
          setCartId(fetchedCartId)
        }
      })
    } else {
      setCartId(null)
    }
  }, [session])
  
  const { data: cartData } = useQuery(GET_CART_ITEMS, {
    variables: { params: { cartId } },
    skip: !cartId,
    pollInterval: 0,
    fetchPolicy: 'cache-and-network',
  })

  // Hide on cart/checkout pages — the bar duplicates the bill there.
  if (['/cart', '/checkout', '/login'].includes(location.pathname)) return null
  if (!cartId) return null

  const items = cartData?.getCartItems?.__typename === 'CartItemsType'
    ? cartData.getCartItems.cartItems
    : []
  if (items.length === 0) return null

  const count = items.reduce((s, c) => s + c.quantity, 0)
  const total = items.reduce((s, c) => s + Number(c.itemPrice) * c.quantity, 0)

  return (
    <div className="global-cart-bar" onClick={() => navigate('/cart')}>
      <span style={{ fontSize: 22 }}>🛒</span>
      <div className="gcb-info">
        <span className="gcb-count">{count} item{count > 1 ? 's' : ''} in cart</span>
        <span className="gcb-total">{inr(total)}</span>
      </div>
      <div className="gcb-divider" />
      <div className="gcb-cta">
        View cart
        <span className="arrow">→</span>
      </div>
    </div>
  )
}
