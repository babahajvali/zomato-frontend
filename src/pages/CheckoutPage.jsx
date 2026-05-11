import { useState, useMemo, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useQuery, useMutation } from '@apollo/client'
import {
  GET_USER_ADDRESSES,
  GET_CART_ITEMS,
  GET_AVAILABLE_PROMO_CODES,
  PLACE_ORDER,
  PLACE_SCHEDULED_ORDER,
  VIEW_RESTAURANT_MENU,
  GET_RESTAURANT_TIMINGS,
  REMOVE_CART_ITEM,
} from '../graphql/operations.js'
import { useAuth } from '../context/AuthContext.jsx'
import { inr, fmtScheduled } from '../lib/format.js'

const MIN_SCHEDULE_LEAD_MINUTES = 30

const pad2 = (n) => String(n).padStart(2, '0')

const toLocalInputValue = (date) => {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`
}

const toLocalDateTimeString = (date) => {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`
}

const dayOfWeekIso = (date) => {
  const js = date.getDay()
  return js === 0 ? 7 : js
}

const timeStringToMinutes = (s) => {
  if (!s) return null
  const [h, m] = s.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return null
  return h * 60 + m
}

function describePromo(p) {
  if (p.discountType === 'PERCENTAGE') {
    return `${Number(p.discountValue)}% off · min ${inr(p.minOrderValue)}`
  }
  return `Flat ${inr(p.discountValue)} off · min ${inr(p.minOrderValue)}`
}

function isPromoLive(p, now) {
  const validFrom = p.validFrom ? new Date(p.validFrom) : null
  const validUntil = p.validUntil ? new Date(p.validUntil) : null
  if (validUntil && validUntil.getTime() < now.getTime()) return false
  if (validFrom && validFrom.getTime() > now.getTime()) return false
  return true
}

export default function CheckoutPage() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const restaurantId = location.state?.restaurantId

  const [selectedAddress, setSelectedAddress] = useState(null)
  const [promoCodeId, setPromoCodeId] = useState(null)
  const [error, setError] = useState('')
  const [unavailableIds, setUnavailableIds] = useState([])
  const [isScheduled, setIsScheduled] = useState(false)
  const [scheduledFor, setScheduledFor] = useState('')

  const { data: addrData, loading: addrLoading } = useQuery(GET_USER_ADDRESSES)
  const { data: cartData, refetch: refetchCart } = useQuery(GET_CART_ITEMS, {
    variables: { params: { cartId: session?.cartId } },
    skip: !session?.cartId,
    fetchPolicy: 'cache-and-network',
  })
  const { data: promoData } = useQuery(GET_AVAILABLE_PROMO_CODES, {
    fetchPolicy: 'cache-and-network',
  })
  const { data: menuData } = useQuery(VIEW_RESTAURANT_MENU, {
    variables: { params: { restaurantId } },
    skip: !restaurantId,
    fetchPolicy: 'cache-first',
  })
  const { data: timingsData } = useQuery(GET_RESTAURANT_TIMINGS, {
    variables: { params: { restaurantId } },
    skip: !restaurantId,
    fetchPolicy: 'cache-first',
  })

  const [placeOrder, { loading: placing }] = useMutation(PLACE_ORDER)
  const [placeScheduledOrder, { loading: placingScheduled }] = useMutation(PLACE_SCHEDULED_ORDER)
  const [removeCartItem, { loading: removing }] = useMutation(REMOVE_CART_ITEM)

  const restaurantTimings = useMemo(() => {
    const t = timingsData?.getRestaurantTimings
    if (t?.__typename !== 'RestaurantTimingsListType') return []
    return t.timings || []
  }, [timingsData])

  const minScheduleInput = useMemo(() => {
    const d = new Date(Date.now() + MIN_SCHEDULE_LEAD_MINUTES * 60 * 1000)
    return toLocalInputValue(d)
  }, [])

  const scheduleValidation = useMemo(() => {
    if (!isScheduled) return { ok: true }
    if (!scheduledFor) return { ok: false, reason: 'Pick a date and time for delivery.' }
    const target = new Date(scheduledFor)
    if (isNaN(target.getTime())) return { ok: false, reason: 'Invalid scheduled time.' }
    const minTime = Date.now() + MIN_SCHEDULE_LEAD_MINUTES * 60 * 1000
    if (target.getTime() < minTime) {
      return { ok: false, reason: `Pick a time at least ${MIN_SCHEDULE_LEAD_MINUTES} minutes from now.` }
    }
    if (restaurantTimings.length > 0) {
      const dow = dayOfWeekIso(target)
      const t = restaurantTimings.find((x) => x.dayOfWeek === dow)
      if (!t) {
        return { ok: false, reason: 'Restaurant is closed on the selected day.' }
      }
      const targetMinutes = target.getHours() * 60 + target.getMinutes()
      const open = timeStringToMinutes(t.openTime)
      const close = timeStringToMinutes(t.closeTime)
      if (open != null && close != null && (targetMinutes < open || targetMinutes >= close)) {
        return {
          ok: false,
          reason: `Restaurant only takes orders between ${t.openTime?.slice(0, 5)} and ${t.closeTime?.slice(0, 5)} on that day.`,
        }
      }
    }
    return { ok: true, target }
  }, [isScheduled, scheduledFor, restaurantTimings])

  const addresses = addrData?.getUserAddress?.__typename === 'UserAddressesType'
    ? addrData.getUserAddress.addresses
    : []
  const cartItems = cartData?.getCartItems?.__typename === 'CartItemsType'
    ? cartData.getCartItems.cartItems
    : []
  const itemsTotal = useMemo(() =>
    cartItems.reduce((s, c) => s + Number(c.itemPrice) * c.quantity, 0), [cartItems])

  const menuItemsById = useMemo(() => {
    const menu = menuData?.viewRestaurantManu
    if (menu?.__typename !== 'RestaurantMenuType') return {}
    const map = {}
    for (const cat of menu.categories) for (const it of cat.items) map[it.itemId] = it
    return map
  }, [menuData])

  const unavailableSet = useMemo(() => new Set(unavailableIds), [unavailableIds])

  // Drop any IDs from the unavailable set that are no longer in the cart
  // (e.g. after the user removes them).
  useEffect(() => {
    if (unavailableIds.length === 0) return
    const inCart = new Set(cartItems.map((c) => c.menuItemId))
    const stillThere = unavailableIds.filter((id) => inCart.has(id))
    if (stillThere.length !== unavailableIds.length) {
      setUnavailableIds(stillThere)
    }
  }, [cartItems, unavailableIds])

  const promos = promoData?.getAvailablePromoCodes?.__typename === 'PromoCodesType'
    ? (promoData.getAvailablePromoCodes.promoCodes || [])
    : []
  const now = new Date()

  useEffect(() => {
    if (!selectedAddress && addresses.length > 0) {
      const def = addresses.find((a) => a.isDefault) || addresses[0]
      setSelectedAddress(def.addressId)
    }
  }, [addresses, selectedAddress])

  if (!restaurantId) {
    return (
      <div className="empty">
        <div className="emoji">⚠️</div>
        <div>Open checkout from your cart so we know which restaurant to order from.</div>
        <button className="btn ghost" style={{ marginTop: 14 }} onClick={() => navigate('/cart')}>Go to cart</button>
      </div>
    )
  }

  const removeUnavailable = async (cartItem) => {
    await removeCartItem({ variables: { params: { cartItemId: cartItem.cartItemId } } })
    setUnavailableIds((prev) => prev.filter((id) => id !== cartItem.menuItemId))
    refetchCart()
  }

  const submit = async () => {
    setError('')
    if (!selectedAddress) { setError('Pick a delivery address.'); return }

    if (isScheduled) {
      if (!scheduleValidation.ok) { setError(scheduleValidation.reason); return }
      const r = await placeScheduledOrder({
        variables: {
          params: {
            restaurantId,
            addressId: Number(selectedAddress),
            promoCodeId: promoCodeId || null,
            scheduledFor: toLocalDateTimeString(scheduleValidation.target),
          },
        },
      })
      const out = r.data?.placeScheduledOrder
      if (!out) { setError('Empty response from server.'); return }
      if (out.__typename === 'ScheduledOrderSummaryType') {
        navigate(`/orders/${out.orderId}`, { replace: true })
        return
      }
      if (out.__typename === 'MenuItemsUnavailable') {
        setUnavailableIds(out.unavailableItemIds || [])
        setError('Some items in your cart are no longer available. Please remove them to proceed.')
        return
      }
      setError(prettyPlaceOrderError(out))
      return
    }

    const r = await placeOrder({
      variables: {
        params: {
          restaurantId,
          addressId: Number(selectedAddress),
          promoCodeId: promoCodeId || null,
        },
      },
    })
    const out = r.data?.placeOrder
    if (!out) { setError('Empty response from server.'); return }
    if (out.__typename === 'OrderSummaryType') {
      navigate(`/orders/${out.orderId}`, { replace: true })
      return
    }
    if (out.__typename === 'MenuItemsUnavailable') {
      setUnavailableIds(out.unavailableItemIds || [])
      setError('Some items in your cart are no longer available. Please remove them to proceed.')
      return
    }
    setError(prettyPlaceOrderError(out))
  }

  const hasUnavailable = unavailableIds.length > 0
  const isPlacing = placing || placingScheduled
  const placeDisabled = isPlacing || hasUnavailable || cartItems.length === 0 ||
    (isScheduled && !scheduleValidation.ok)

  return (
    <>
      <h1 className="page-title">Checkout</h1>
      <p className="page-sub">Pick an address and (optionally) apply a promo. We'll calculate delivery and tax server-side.</p>

      {error && (
        <div className={'errbox checkout-error-toast' + (hasUnavailable ? ' is-unavailable' : '')}>
          {error}
        </div>
      )}

      <div className="two-col">
        <div className="card card-pad">
          <h3 style={{ marginTop: 0 }}>Items in your order</h3>
          {cartItems.length === 0 && (
            <div style={{ color: 'var(--muted)' }}>Your cart is empty.</div>
          )}
          <div className="checkout-items">
            {cartItems.map((c) => {
              const mi = menuItemsById[c.menuItemId]
              const isUnavailable = unavailableSet.has(c.menuItemId)
              return (
                <div
                  key={c.cartItemId}
                  className={'checkout-item' + (isUnavailable ? ' is-unavailable' : '')}
                >
                  <div className="checkout-item-main">
                    <div className="checkout-item-name">
                      {mi?.name || `Item ${String(c.menuItemId).slice(0, 8)}…`}
                      {isUnavailable && <span className="unavailable-badge">Unavailable</span>}
                    </div>
                    <div className="checkout-item-meta">
                      {c.quantity} × {inr(c.itemPrice)}
                    </div>
                  </div>
                  <div className="checkout-item-right">
                    <span className="checkout-item-subtotal">
                      {inr(Number(c.itemPrice) * c.quantity)}
                    </span>
                    {isUnavailable && (
                      <button
                        className="btn danger sm"
                        disabled={removing}
                        onClick={() => removeUnavailable(c)}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="divider" />

          <h3 style={{ marginTop: 0 }}>Deliver to</h3>
          {addrLoading && <div className="spinner" />}
          {!addrLoading && addresses.length === 0 && (
            <div style={{ color: 'var(--muted)' }}>No saved addresses.</div>
          )}
          {addresses.map((a) => (
            <label
              key={a.addressId}
              className={'address-card' + (String(selectedAddress) === String(a.addressId) ? ' selected' : '')}
            >
              <div className="label-row">
                <span>
                  <input
                    type="radio"
                    name="addr"
                    style={{ marginRight: 8 }}
                    checked={String(selectedAddress) === String(a.addressId)}
                    onChange={() => setSelectedAddress(a.addressId)}
                  />
                  {a.label}
                </span>
                {a.isDefault && <span className="tag">Default</span>}
              </div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginLeft: 22 }}>
                {a.fullAddress}, {a.city} – {a.pincode}
              </div>
            </label>
          ))}

          <div className="divider" />
          <h3 style={{ marginTop: 0 }}>Apply a promo code</h3>
          {promos.length === 0 && (
            <div style={{ color: 'var(--muted)', fontSize: 13 }}>
              No active offers right now.
            </div>
          )}
          {promos.length > 0 && (
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
              <div
                className={'address-card' + (promoCodeId === null ? ' selected' : '')}
                onClick={() => setPromoCodeId(null)}
              >
                <div className="label-row"><span>No promo</span></div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>Skip discount</div>
              </div>
              {promos.map((p) => {
                const live = isPromoLive(p, now)
                const eligible = itemsTotal >= Number(p.minOrderValue || 0)
                const disabled = !live || !eligible
                return (
                  <div
                    key={p.promoCodeId}
                    className={'address-card' + (promoCodeId === p.promoCodeId ? ' selected' : '')}
                    onClick={() => !disabled && setPromoCodeId(p.promoCodeId)}
                    style={disabled ? { opacity: 0.55, cursor: 'not-allowed' } : undefined}
                    title={
                      !live ? 'This offer is no longer valid'
                        : !eligible ? `Add ${inr(Number(p.minOrderValue) - itemsTotal)} more to apply`
                        : ''
                    }
                  >
                    <div className="label-row"><span>{p.code}</span></div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{describePromo(p)}</div>
                    {!live && <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 4, fontWeight: 700 }}>Expired</div>}
                    {live && !eligible && <div style={{ fontSize: 11, color: 'var(--brand-darker)', marginTop: 4, fontWeight: 700 }}>Min order not met</div>}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <aside className="card card-pad">
          <h3 style={{ marginTop: 0 }}>Summary</h3>
          <div className="summary-row"><span>Items</span><span>{inr(itemsTotal)}</span></div>
          <div className="summary-row" style={{ color: 'var(--muted)' }}><span>Delivery + tax</span><span>computed by server</span></div>
          <div className="summary-row total"><span>Estimated</span><span>{inr(itemsTotal)}</span></div>

          <div className="schedule-section">
            <div className="schedule-header">
              <div className="schedule-title">
                <span className="schedule-title-text">Schedule for later</span>
                <span className="schedule-sub">Choose a delivery time that works for you</span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isScheduled}
                aria-label="Toggle scheduled delivery"
                className={'schedule-toggle' + (isScheduled ? ' on' : '')}
                onClick={() => setIsScheduled((v) => !v)}
              >
                <span className="schedule-toggle-thumb" />
              </button>
            </div>

            {isScheduled && (
              <div className="schedule-picker">
                <label className="schedule-picker-label">Delivery date &amp; time</label>
                <input
                  className="schedule-picker-input"
                  type="datetime-local"
                  min={minScheduleInput}
                  value={scheduledFor}
                  onChange={(e) => setScheduledFor(e.target.value)}
                />
                {scheduleValidation.ok && scheduledFor && (
                  <div className="schedule-preview">
                    Delivery: <strong>{fmtScheduled(scheduleValidation.target)}</strong>
                  </div>
                )}
                {!scheduleValidation.ok && scheduledFor && (
                  <div className="schedule-warning">{scheduleValidation.reason}</div>
                )}
              </div>
            )}
          </div>

          <button
            className={'btn block' + (placeDisabled ? ' is-disabled' : '')}
            style={{ marginTop: 12 }}
            disabled={placeDisabled}
            onClick={submit}
          >
            {isPlacing
              ? (isScheduled ? 'Scheduling order…' : 'Placing order…')
              : (isScheduled ? 'Schedule order' : 'Place order')}
          </button>
          {hasUnavailable && (
            <div className="checkout-place-hint">
              Remove unavailable items above to continue.
            </div>
          )}
        </aside>
      </div>
    </>
  )
}

function prettyPlaceOrderError(out) {
  switch (out.__typename) {
    case 'PromoCodeUsageLimitReached': return `Promo limit reached (max ${out.maxUsageCount} usages)`
    case 'PromoCodeNotEligible': return `Cart total too low for this promo (min ₹${out.minOrderValue})`
    case 'DeliveryUnavailableForAddress': return `This restaurant does not deliver to ${out.pinCode}`
    case 'AddressIdNotFound': return `Selected address not found`
    case 'RestaurantNotOpen': return `Restaurant is closed today (day ${out.dayOfWeek})`
    case 'RestaurantClosed': return `Restaurant is currently closed`
    case 'ScheduledTimeTooSoon': return `Pick a time further out — that slot is too soon.`
    case 'RestaurantNotOpenAtScheduledTime': return `Restaurant is not open at the selected time.`
    case 'PromoCodeNotFound': return `Promo code not found`
    case 'CartIsEmpty': return `Cart is empty`
    case 'CustomerCartNotFound': return `No cart for this customer — please re-login`
    default: return `Unable to place order: ${out.__typename}`
  }
}
