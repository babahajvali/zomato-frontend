import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useApolloClient } from '@apollo/client'
import {
  GET_CART_ITEMS,
  UPDATE_CART_ITEM,
  REMOVE_CART_ITEM,
  CLEAR_CART_ITEMS,
  BROWSE_RESTAURANTS,
  VIEW_RESTAURANT_MENU,
} from '../graphql/operations.js'
import { useAuth } from '../context/AuthContext.jsx'
import { inr, titleCase } from '../lib/format.js'

const TAX_RATE = 0.05

export default function CartPage() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const cartId = session?.cartId
  const client = useApolloClient()

  const { data, loading, refetch } = useQuery(GET_CART_ITEMS, {
    variables: { params: { cartId } },
    skip: !cartId,
  })

  const [updateCartItem] = useMutation(UPDATE_CART_ITEM)
  const [removeCartItem] = useMutation(REMOVE_CART_ITEM)
  const [clearCart] = useMutation(CLEAR_CART_ITEMS)

  const cartItems = data?.getCartItems?.__typename === 'CartItemsType'
    ? data.getCartItems.cartItems
    : []

  const [menuItemsById, setMenuItemsById] = useState({})
  const [restaurantOfCart, setRestaurantOfCart] = useState(null)

  // Resolve item names + restaurant by scanning all restaurants' menus.
  useEffect(() => {
    if (cartItems.length === 0) {
      setMenuItemsById({})
      setRestaurantOfCart(null)
      return
    }
    let cancelled = false
    ;(async () => {
      const br = await client.query({
        query: BROWSE_RESTAURANTS,
        variables: { params: { limit: 100, offset: 0 } },
      })
      const list = br.data?.browseRestaurants
      if (list?.__typename !== 'BrowseRestaurantsType') return
      const restaurants = list.restaurants
      const collected = {}
      let owner = null
      for (const r of restaurants) {
        try {
          const m = await client.query({
            query: VIEW_RESTAURANT_MENU,
            variables: { params: { restaurantId: r.restaurantId } },
          })
          const menu = m.data?.viewRestaurantManu
          if (menu?.__typename !== 'RestaurantMenuType') continue
          for (const cat of menu.categories) {
            for (const it of cat.items) {
              collected[it.itemId] = { ...it, restaurant: r }
              if (cartItems.some((c) => c.menuItemId === it.itemId)) {
                owner = r
              }
            }
          }
          if (owner) break
        } catch {}
      }
      if (cancelled) return
      setMenuItemsById(collected)
      setRestaurantOfCart(owner)
    })()
    return () => { cancelled = true }
  }, [cartItems.length, client]) // eslint-disable-line

  const itemsTotal = useMemo(
    () => cartItems.reduce((s, c) => s + Number(c.itemPrice) * c.quantity, 0),
    [cartItems]
  )
  const tax = useMemo(() => +(itemsTotal * TAX_RATE).toFixed(2), [itemsTotal])

  const setQty = async (item, nextQty) => {
    if (nextQty <= 0) {
      await removeCartItem({ variables: { params: { cartItemId: item.cartItemId } } })
    } else {
      await updateCartItem({
        variables: { params: { cartId, menuItemId: item.menuItemId, quantity: Math.min(nextQty, 10) } },
      })
    }
    refetch()
  }

  const onClear = async () => {
    if (!confirm('Clear all items from cart?')) return
    await clearCart({ variables: { params: { cartId } } })
    refetch()
  }

  if (!cartId) {
    return <div className="errbox">No cart was associated with your account. Please re-login (the launch script creates one).</div>
  }

  if (loading) return <div className="empty"><span className="spinner" /></div>

  if (cartItems.length === 0) {
    return (
      <div className="empty">
        <div className="emoji">🛒</div>
        <div>Your cart is empty.</div>
        <button className="btn ghost" style={{ marginTop: 14 }} onClick={() => navigate('/')}>Browse restaurants</button>
      </div>
    )
  }

  return (
    <>
      <h1 className="page-title">Your cart</h1>
      {restaurantOfCart && (
        <p className="page-sub">
          From <strong>{restaurantOfCart.name}</strong>
          {' · '}
          <span style={{ color: 'var(--muted)' }}>{titleCase(restaurantOfCart.cuisineType)}</span>
        </p>
      )}

      <div className="two-col cart-layout">
        <div className="card card-pad cart-items-card">
          {cartItems.map((c) => {
            const it = menuItemsById[c.menuItemId]
            return (
              <div className="menu-row cart-item-row" key={c.cartItemId}>
                <div className="menu-info">
                  <div className="menu-name">
                    {it ? (
                      <>
                        <span style={{ color: it.isVeg ? 'var(--green)' : 'var(--red)', fontSize: 12, marginRight: 6 }}>●</span>
                        {it.name}
                      </>
                    ) : (
                      <em>{c.menuItemId.slice(0, 8)}…</em>
                    )}
                  </div>
                  {it && <p className="menu-desc">{it.description}</p>}
                  <div className="cart-item-each-price">{inr(c.itemPrice)} each</div>
                </div>
                <div className="menu-action cart-item-actions">
                  <span className="menu-price">{inr(Number(c.itemPrice) * c.quantity)}</span>
                  <div className="qty cart-item-qty">
                    <button onClick={() => setQty(c, c.quantity - 1)}>−</button>
                    <span>{c.quantity}</span>
                    <button onClick={() => setQty(c, c.quantity + 1)}>+</button>
                  </div>
                  <button className="btn subtle sm cart-item-remove" onClick={() => setQty(c, 0)}>Remove</button>
                </div>
              </div>
            )
          })}
          <div className="cart-clear-row">
            <button className="btn subtle sm cart-clear-btn" onClick={onClear}>Clear cart</button>
          </div>
        </div>

        <aside className="card card-pad">
          <h3 style={{ marginTop: 0 }}>Bill summary</h3>
          <div className="summary-row"><span>Item total</span><span>{inr(itemsTotal)}</span></div>
          <div className="summary-row"><span>Tax (5%)</span><span>{inr(tax)}</span></div>
          <div className="summary-row" style={{ color: 'var(--muted)', fontStyle: 'italic' }}>
            <span>Delivery fee</span><span>calculated at checkout</span>
          </div>
          <div className="summary-row total">
            <span>Items + Tax</span>
            <span>{inr(itemsTotal + tax)}</span>
          </div>
          <button
            className="btn block"
            style={{ marginTop: 14 }}
            disabled={!restaurantOfCart}
            onClick={() => navigate('/checkout', { state: { restaurantId: restaurantOfCart?.restaurantId } })}
          >
            Proceed to checkout
          </button>
        </aside>
      </div>
    </>
  )
}
