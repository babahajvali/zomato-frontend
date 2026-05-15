import { useState, useMemo, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useApolloClient } from '@apollo/client'
import {
  GET_ORDER,
  CANCEL_ORDER,
  CREATE_REVIEW,
  BROWSE_RESTAURANTS,
  VIEW_RESTAURANT_MENU,
  GET_USER_RESTAURANT_REVIEW,
  USER_SCHEDULED_ORDERS,
} from '../graphql/operations.js'
import { inr, fmtDate, fmtScheduled, titleCase } from '../lib/format.js'
import { getUserId } from '../lib/session.js'

const STATUS_FLOW = ['PLACED', 'CONFIRMED', 'PREPARING', 'OUT_OF_DELIVERY', 'DELIVERED']

export default function OrderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const client = useApolloClient()

  const { data, loading, refetch } = useQuery(GET_ORDER, {
    variables: { params: { orderId: id } },
  })
  const [cancelOrder, { loading: cancelling }] = useMutation(CANCEL_ORDER)
  const [createReview, { loading: reviewing }] = useMutation(CREATE_REVIEW)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [cancelExpired, setCancelExpired] = useState(false)
  const [rating, setRating] = useState(5)
  const [reviewText, setReviewText] = useState('')

  const [itemNamesById, setItemNamesById] = useState({})
  const [restaurant, setRestaurant] = useState(null)

  const order = data?.getOrder?.__typename === 'OrderSummaryType' ? data.getOrder : null

  const { data: scheduledData } = useQuery(USER_SCHEDULED_ORDERS, {
    variables: { params: { limit: 100, offset: 0 } },
    fetchPolicy: 'cache-and-network',
  })
  const scheduledMatch = useMemo(() => {
    const list = scheduledData?.userScheduledOrders
    if (list?.__typename !== 'ScheduledOrderSummariesType') return null
    return (list.orderSummaries || []).find((o) => o.orderId === id) || null
  }, [scheduledData, id])
  const isScheduled = Boolean(scheduledMatch?.scheduledFor)

  const customerId = getUserId()
  const { data: userReviewData, loading: userReviewLoading, refetch: refetchUserReview } = useQuery(
    GET_USER_RESTAURANT_REVIEW,
    {
      variables: { params: { restaurantId: order?.restaurantId } },
      skip: !order?.restaurantId,
      fetchPolicy: 'cache-and-network',
    },
  )
  const existingReview = userReviewData?.getUserRestaurantReview?.__typename === 'ReviewType'
    ? userReviewData.getUserRestaurantReview
    : null

  useEffect(() => {
    if (!order) return
    let cancelled = false
    ;(async () => {
      const br = await client.query({
        query: BROWSE_RESTAURANTS,
        variables: { params: { limit: 100, offset: 0 } },
      })
      if (cancelled) return
      const list = br.data?.browseRestaurants
      if (list?.__typename !== 'BrowseRestaurantsType') return
      const r = list.restaurants.find((x) => x.restaurantId === order.restaurantId)
      setRestaurant(r || null)

      // load that restaurant's menu for item names
      const m = await client.query({
        query: VIEW_RESTAURANT_MENU,
        variables: { params: { restaurantId: order.restaurantId } },
        fetchPolicy: 'cache-first',
      })
      if (cancelled) return
      const menu = m.data?.viewRestaurantManu
      if (menu?.__typename !== 'RestaurantMenuType') return
      const map = {}
      for (const cat of menu.categories) for (const it of cat.items) map[it.itemId] = it
      setItemNamesById(map)
    })()
    return () => { cancelled = true }
  }, [order, client])

  if (loading) return <div className="empty"><span className="spinner" /></div>

  if (!order) {
    return (
      <div className="empty">
        <div className="emoji">🤔</div>
        <div>Order not found.</div>
        <button className="btn ghost" style={{ marginTop: 14 }} onClick={() => navigate('/orders')}>Back to orders</button>
      </div>
    )
  }

  const stepIdx = STATUS_FLOW.indexOf(order.status)
  const isCancelled = order.status === 'CANCELLED'
  const placedAtMs = new Date(order.placedAt).getTime()
  const cancellable = !isCancelled && order.status === 'PLACED' && !cancelExpired &&
    !isNaN(placedAtMs) && (Date.now() - placedAtMs) < 5 * 60 * 1000

  const tryCancel = async () => {
    setError(''); setSuccess('')
    const r = await cancelOrder({ variables: { params: { orderId: order.orderId } } })
    const out = r.data?.cancelOrder
    if (out?.__typename === 'OrderType') {
      setSuccess('Order cancelled.')
      refetch()
    } else {
      setError(prettyCancelError(out))
      if (out?.__typename === 'OrderCancellationWindowExpired') {
        setCancelExpired(true)
      }
    }
  }

  const submitReview = async () => {
    setError(''); setSuccess('')
    const r = await createReview({
      variables: { params: { restaurantId: order.restaurantId, rating: Number(rating), review: reviewText } },
    })
    const out = r.data?.createReview
    if (out?.__typename === 'ReviewType') {
      setSuccess('Thanks for your review!')
      setReviewText('')
      refetchUserReview()
    } else if (out?.__typename === 'RestaurantAlreadyReviewedByUser') {
      setError('You have already reviewed this restaurant.')
      refetchUserReview()
    } else {
      setError('Could not save review: ' + out?.__typename)
    }
  }

  return (
    <>
      <h1 className="page-title">Order #{order.orderId.slice(0, 8)}</h1>
      <p className="page-sub">
        Placed {fmtDate(order.placedAt)}
        {restaurant && (
          <>
            {' · '}<Link to={`/restaurants/${restaurant.restaurantId}`} style={{ color: 'var(--brand)' }}>{restaurant.name}</Link>
          </>
        )}
      </p>

      {error && <div className="errbox">{error}</div>}
      {success && <div className="success">{success}</div>}

      <div className="card card-pad" style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div className={'status ' + order.status}>{order.status.replace(/_/g, ' ')}</div>
            {isScheduled && <span className="scheduled-badge">Scheduled</span>}
          </div>
          {cancellable && (
            <button className="btn danger sm" onClick={tryCancel} disabled={cancelling}>
              {cancelling ? 'Cancelling…' : 'Cancel order'}
            </button>
          )}
        </div>
        {isScheduled && (
          <div className="scheduled-banner">
            <span className="scheduled-banner-icon" aria-hidden>⏱</span>
            <div className="scheduled-banner-text">
              <span className="scheduled-banner-label">Scheduled delivery</span>
              <span className="scheduled-banner-time">{fmtScheduled(scheduledMatch.scheduledFor)}</span>
            </div>
          </div>
        )}
        {!isCancelled && (
          <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
            {STATUS_FLOW.map((s, i) => (
              <div key={s} style={{
                flex: 1,
                height: 6,
                borderRadius: 999,
                background: i <= stepIdx ? 'var(--brand)' : '#eee',
              }} />
            ))}
          </div>
        )}
        {!isCancelled && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: 'var(--muted)' }}>
            {STATUS_FLOW.map((s) => (
              <span key={s}>{titleCase(s)}</span>
            ))}
          </div>
        )}
      </div>

      <div className="two-col">
        <div className="card card-pad">
          <h3 style={{ marginTop: 0 }}>Items</h3>
          {order.items.map((it, idx) => (
            <div className="summary-row" key={idx}>
              <span>{(itemNamesById[it.itemId]?.name) || it.itemId.slice(0, 8) + '…'} × {it.quantity}</span>
              <span>{inr(it.subtotal)}</span>
            </div>
          ))}
        </div>

        <aside className="card card-pad">
          <h3 style={{ marginTop: 0 }}>Bill</h3>
          <div className="summary-row"><span>Item total</span><span>{inr(order.itemsTotal)}</span></div>
          <div className="summary-row"><span>Delivery</span><span>{inr(order.deliveryFee)}</span></div>
          <div className="summary-row"><span>Tax</span><span>{inr(order.taxFee)}</span></div>
          {order.promoCodeId && (
            <div className="summary-row"><span>Promo applied</span><span>#{order.promoCodeId}</span></div>
          )}
          <div className="summary-row total"><span>Final</span><span>{inr(order.finalAmount)}</span></div>
        </aside>
      </div>

      {order.status === 'DELIVERED' && (
        <div className={'card card-pad review-section' + (userReviewLoading && !existingReview ? ' is-loading' : '')} style={{ marginTop: 18 }}>
          <h3 style={{ marginTop: 0 }}>Rate this restaurant</h3>
          {existingReview ? (
            <ExistingReviewCard review={existingReview} />
          ) : (
            <>
              <div className="rv-stars-input" aria-label="Star rating selector">
                {[1, 2, 3, 4, 5].map((n) => (
                  <span
                    key={n}
                    role="button"
                    tabIndex={0}
                    className={'rv-star-input' + (n <= rating ? ' active' : '')}
                    onClick={() => setRating(n)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setRating(n) }}
                  >★</span>
                ))}
              </div>
              <textarea
                className="textarea"
                rows={3}
                placeholder="Share your experience…"
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
              />
              <button
                className="btn rv-submit"
                style={{ marginTop: 8 }}
                disabled={reviewing}
                onClick={submitReview}
              >
                {reviewing ? 'Saving…' : 'Submit review'}
              </button>
            </>
          )}
        </div>
      )}
    </>
  )
}

function ExistingReviewCard({ review }) {
  const rating = Math.round(Number(review.rating || 0))
  return (
    <div className="rv-existing">
      <div className="rv-existing-head">
        <div className="rv-stars-display" aria-label={`Rated ${rating} out of 5`}>
          {[1, 2, 3, 4, 5].map((n) => (
            <span key={n} className={'rv-star' + (n <= rating ? ' filled' : '')}>★</span>
          ))}
        </div>
        {review.createdAt && (
          <span className="rv-date">{fmtDate(review.createdAt)}</span>
        )}
      </div>
      {review.review && <p className="rv-text">{review.review}</p>}
      <div className="rv-msg">You have already reviewed this restaurant.</div>
      <button className="btn rv-submitted" disabled>
        Review Submitted
      </button>
    </div>
  )
}

function prettyCancelError(out) {
  switch (out?.__typename) {
    case 'OrderNotFound': return 'Order not found.'
    case 'OrderNotOwnedByUser': return 'This order is not yours.'
    case 'OrderCancellationWindowExpired': {
      const m = out.minutes
      const label = m == null ? '' : ` (${m} minute${m === 1 ? '' : 's'})`
      return `Cancellation window${label} expired.`
    }
    case 'OrderCancellationNotAllowed': return 'Order is past the point where it can be cancelled.'
    default: return 'Unable to cancel this order.'
  }
}
