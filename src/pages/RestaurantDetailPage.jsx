import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@apollo/client'
import {
  VIEW_RESTAURANT_MENU,
  GET_RESTAURANT_TIMINGS,
  BROWSE_RESTAURANTS,
  GET_CART_ITEMS,
  UPDATE_CART_ITEM,
  REMOVE_CART_ITEM,
} from '../graphql/operations.js'
import { inr, titleCase } from '../lib/format.js'
import { useAuth } from '../context/AuthContext.jsx'

const DAYS = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function RestaurantDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { session } = useAuth()
  const cartId = session?.cartId

  const { data: menuData, loading: menuLoading } = useQuery(VIEW_RESTAURANT_MENU, {
    variables: { params: { restaurantId: id } },
  })
  const { data: timingsData } = useQuery(GET_RESTAURANT_TIMINGS, {
    variables: { params: { restaurantId: id } },
  })
  const { data: brData } = useQuery(BROWSE_RESTAURANTS, {
    variables: { params: { search: null, limit: 100, offset: 0 } },
  })

  const { data: cartData, refetch: refetchCart } = useQuery(GET_CART_ITEMS, {
    variables: { params: { cartId } },
    skip: !cartId,
  })

  const [updateCartItem, { loading: updating }] = useMutation(UPDATE_CART_ITEM)
  const [removeCartItem] = useMutation(REMOVE_CART_ITEM)
  const [feedback, setFeedback] = useState('')

  const restaurant = useMemo(() => {
    const list = brData?.browseRestaurants
    if (list?.__typename !== 'BrowseRestaurantsType') return null
    return list.restaurants.find((r) => r.restaurantId === id) || null
  }, [brData, id])

  const menu = menuData?.viewRestaurantManu
  const categories = menu?.__typename === 'RestaurantMenuType' ? menu.categories : []

  const timings = timingsData?.getRestaurantTimings
  const timingList = timings?.__typename === 'RestaurantTimingsListType' ? timings.timings : []

  const cartItems = cartData?.getCartItems?.__typename === 'CartItemsType'
    ? cartData.getCartItems.cartItems
    : []
  const cartItemByMenuId = useMemo(() => {
    const map = {}
    for (const c of cartItems) map[c.menuItemId] = c
    return map
  }, [cartItems])

  const allMenuItemIds = useMemo(() => {
    const set = new Set()
    for (const c of categories) for (const it of c.items) set.add(it.itemId)
    return set
  }, [categories])

  const cartHasOtherRestaurant = cartItems.length > 0 && cartItems.some(c => !allMenuItemIds.has(c.menuItemId))

  useEffect(() => { if (feedback) { const t = setTimeout(() => setFeedback(''), 2200); return () => clearTimeout(t) } }, [feedback])

  const setQty = async (item, nextQty) => {
    if (!cartId) {
      setFeedback('No cart available — log in again.')
      return
    }
    if (nextQty <= 0) {
      const existing = cartItemByMenuId[item.itemId]
      if (existing) {
        await removeCartItem({ variables: { params: { cartItemId: existing.cartItemId } } })
        await refetchCart()
      }
      return
    }
    if (nextQty > 10) nextQty = 10
    const r = await updateCartItem({
      variables: { params: { cartId, menuItemId: item.itemId, quantity: nextQty } },
    })
    const tn = r.data?.updateCartItem?.__typename
    if (tn !== 'CartItemType') {
      setFeedback('Could not update item: ' + tn)
    }
    await refetchCart()
  }

  const cartTotalForThisR = cartItems
    .filter((c) => allMenuItemIds.has(c.menuItemId))
    .reduce((s, c) => s + Number(c.itemPrice) * c.quantity, 0)
  const cartCountForThisR = cartItems
    .filter((c) => allMenuItemIds.has(c.menuItemId))
    .reduce((s, c) => s + c.quantity, 0)

  if (menuLoading) return <div className="empty"><span className="spinner" /></div>

  if (menu?.__typename === 'RestaurantNotFound') {
    return (
      <div className="empty">
        <div className="emoji">🤷</div>
        <div className="empty-title">Restaurant not found</div>
        <button className="btn ghost" style={{ marginTop: 14 }} onClick={() => navigate('/')}>Back to home</button>
      </div>
    )
  }

  const cuisineKey = restaurant?.cuisineType?.toLowerCase()

  return (
    <>
      {/* Hero */}
      <div className={'card ' + (cuisineKey || '')} style={{
        marginBottom: 20,
        overflow: 'hidden',
        border: 'none',
      }}>
        <div className={'r-banner ' + (restaurant?.isVegOnly ? 'veg ' : '') + (cuisineKey || '')} style={{ height: 180, fontSize: 80 }}>
          <span>{pickEmoji(restaurant?.cuisineType)}</span>
        </div>
        <div className="card-pad" style={{ paddingTop: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <h1 className="page-title" style={{ marginBottom: 8 }}>{restaurant?.name || 'Restaurant'}</h1>
              <div className="r-meta-row" style={{ fontSize: 14 }}>
                {restaurant?.cuisineType && <span style={{ color: 'var(--text)', fontWeight: 500 }}>{titleCase(restaurant.cuisineType)}</span>}
                <span className="dot-sep">·</span>
                <span>{restaurant?.address}</span>
              </div>
              <div className="r-meta-row" style={{ marginTop: 4 }}>
                <span>📍 {restaurant?.pinCode}</span>
                <span className="dot-sep">·</span>
                <span style={{ color: restaurant?.isOpen ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>
                  {restaurant?.isOpen ? 'Open now' : 'Closed'}
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
              {restaurant?.totalReviews > 0 ? (
                <span className="rating-pill" style={{ fontSize: 14, padding: '5px 12px' }}>★ {restaurant.averageRating.toFixed(1)}</span>
              ) : (
                <span className="rating-pill muted" style={{ fontSize: 14, padding: '5px 12px' }}>New</span>
              )}
              {restaurant?.totalReviews > 0 && (
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>{restaurant.totalReviews} reviews</span>
              )}
              {restaurant?.isVegOnly && <span className="veg-pill">PURE VEG</span>}
            </div>
          </div>
          {timingList.length > 0 && (
            <div style={{
              marginTop: 16,
              padding: '12px 14px',
              background: 'var(--brand-tint)',
              borderRadius: 10,
              fontSize: 13,
              color: 'var(--text)',
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              flexWrap: 'wrap',
            }}>
              <span>🕒</span>
              <strong>Timings:</strong>
              <span style={{ color: 'var(--muted)' }}>
                {timingList
                  .slice()
                  .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
                  .map((t) => `${DAYS[t.dayOfWeek]} ${t.openTime?.slice(0, 5)}-${t.closeTime?.slice(0, 5)}`)
                  .join('  ·  ')}
              </span>
            </div>
          )}
        </div>
      </div>

      {feedback && <div className="errbox">{feedback}</div>}
      {cartHasOtherRestaurant && (
        <div className="errbox">
          You have items from another restaurant in your cart. Clear cart before adding from here.
          <button className="btn sm" style={{ marginLeft: 10 }} onClick={() => navigate('/cart')}>Open cart</button>
        </div>
      )}

      {/* Category jump tabs */}
      {categories.length > 0 && (
        <div className="cuisine-strip" style={{ marginBottom: 14 }}>
          {categories.map((cat) => (
            <a
              key={cat.category}
              href={`#cat-${cat.category}`}
              className="cuisine-pill"
              onClick={(e) => {
                e.preventDefault()
                document.getElementById(`cat-${cat.category}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }}
            >
              {titleCase(cat.category)}
              <span style={{ color: 'var(--muted)', fontWeight: 500, fontSize: 12 }}>· {cat.items.length}</span>
            </a>
          ))}
        </div>
      )}

      <div className="two-col">
        <div className="card card-pad">
          {categories.length === 0 && <div className="empty">No menu items yet</div>}
          {categories.map((cat) => (
            <section key={cat.category} id={`cat-${cat.category}`} style={{ scrollMarginTop: 80 }}>
              <h2 className="menu-cat-title">
                {titleCase(cat.category)}
                <span style={{ color: 'var(--muted)', fontSize: 13, fontWeight: 500 }}>{cat.items.length}</span>
              </h2>
              {cat.items.map((it) => {
                const inCart = cartItemByMenuId[it.itemId]
                const qty = inCart?.quantity || 0
                return (
                  <div className="menu-row" key={it.itemId}>
                    <div className="menu-info">
                      <div className="menu-name">
                        <span className={'veg-mark' + (it.isVeg ? '' : ' non-veg')} aria-hidden />
                        <span>{it.name}</span>
                        {!it.isAvailable && <span className="tag warn">Unavailable</span>}
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-strong)', margin: '4px 0 6px' }}>
                        {inr(it.price)}
                      </div>
                      {it.description && <p className="menu-desc">{it.description}</p>}
                      <div className="menu-tags">
                        {(it.tags || []).map((t) => (
                          <span className="tag" key={t}>{t}</span>
                        ))}
                        <span className="tag">⏱ {it.preparationTimeInMinutes} min</span>
                      </div>
                    </div>
                    <div className="menu-action">
                      <div style={{
                        width: 100, height: 100, borderRadius: 12,
                        background: it.isVeg
                          ? 'linear-gradient(135deg, #d6f4d0 0%, #a8e69a 100%)'
                          : 'linear-gradient(135deg, #ffe2cc 0%, #ffcfa3 100%)',
                        display: 'grid', placeItems: 'center', fontSize: 38,
                        marginBottom: 4, opacity: it.isAvailable ? 1 : 0.4,
                      }}>
                        {pickItemEmoji(cat.category)}
                      </div>
                      {!it.isAvailable ? (
                        <button className="btn subtle sm" disabled>Unavailable</button>
                      ) : qty === 0 ? (
                        <button
                          className="btn ghost sm"
                          disabled={updating || cartHasOtherRestaurant}
                          onClick={() => setQty(it, 1)}
                          style={{ minWidth: 90 }}
                        >
                          ADD
                        </button>
                      ) : (
                        <div className="qty">
                          <button onClick={() => setQty(it, qty - 1)}>−</button>
                          <span>{qty}</span>
                          <button onClick={() => setQty(it, qty + 1)}>+</button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </section>
          ))}
        </div>

        <aside className="card card-pad" style={{ position: 'sticky', top: 86 }}>
          <h3 style={{ marginTop: 0, marginBottom: 12, fontSize: 17, color: 'var(--text-strong)' }}>
            🛒 Your order
          </h3>
          {cartItems.length === 0 && (
            <div style={{ color: 'var(--muted)', fontSize: 14, padding: '20px 0', textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🍽️</div>
              Your cart is empty.<br />
              Add items to start your order.
            </div>
          )}
          {cartItems.length > 0 && (
            <>
              {cartItems
                .filter((c) => allMenuItemIds.has(c.menuItemId))
                .map((c) => {
                  const item = findMenuItem(categories, c.menuItemId)
                  return (
                    <div className="summary-row" key={c.cartItemId}>
                      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item?.name || c.menuItemId.slice(0, 6)}
                        <span style={{ color: 'var(--muted)' }}> × {c.quantity}</span>
                      </span>
                      <span>{inr(Number(c.itemPrice) * c.quantity)}</span>
                    </div>
                  )
                })}
              <div className="summary-row total">
                <span>Subtotal</span>
                <span>{inr(cartTotalForThisR)}</span>
              </div>
              <button
                className="btn block"
                style={{ marginTop: 12 }}
                onClick={() => navigate('/cart')}
              >
                Go to cart →
              </button>
            </>
          )}
        </aside>
      </div>

    </>
  )
}

function pickEmoji(cuisine) {
  const map = {
    SOUTH_INDIAN: '🥘',
    NORTH_INDIAN: '🍛',
    CHINESE: '🥡',
    ITALIAN: '🍕',
    FAST_FOOD: '🍔',
    BAKERY: '🥐',
    CAFE: '☕',
  }
  return map[cuisine] || '🍽️'
}

function pickItemEmoji(category) {
  const map = {
    STARTER: '🥗',
    MAIN_COURSE: '🍛',
    BREADS: '🫓',
    RICE_AND_BIRYANI: '🍚',
    BEVERAGES: '🥤',
    DESSERTS: '🍰',
    SOUPS: '🍲',
    SALADS: '🥗',
    COMBO: '🍱',
  }
  return map[category] || '🍽️'
}

function findMenuItem(categories, itemId) {
  for (const c of categories) for (const it of c.items) if (it.itemId === itemId) return it
  return null
}
