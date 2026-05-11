import { useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@apollo/client'
import {
  TODAY_RESTAURANT_ORDERS,
  UPDATE_ORDER_STATUS,
  VIEW_RESTAURANT_MENU,
} from '../../graphql/operations.js'
import { inr, fmtDate, titleCase } from '../../lib/format.js'

const FILTERS = [
  { value: 'ALL', label: 'All' },
  { value: 'PLACED', label: 'New' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'PREPARING', label: 'Preparing' },
  { value: 'OUT_OF_DELIVERY', label: 'Out for delivery' },
  { value: 'DELIVERED', label: 'Delivered' },
]

const ADVANCE = {
  PLACED: 'CONFIRMED',
  CONFIRMED: 'PREPARING',
  PREPARING: 'OUT_OF_DELIVERY',
  OUT_OF_DELIVERY: 'DELIVERED',
}

const ADVANCE_LABEL = {
  PLACED: 'Accept',
  CONFIRMED: 'Start preparing',
  PREPARING: 'Mark ready',
  OUT_OF_DELIVERY: 'Mark delivered',
}

const STATUS_DOT_TEXT = {
  PLACED: 'New',
  CONFIRMED: 'Confirmed',
  PREPARING: 'Preparing',
  OUT_OF_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
}

export default function LiveOrdersPanel() {
  const { restaurantId } = useParams()
  const [filter, setFilter] = useState('ALL')
  const [error, setError] = useState('')

  const { data, loading, refetch } = useQuery(TODAY_RESTAURANT_ORDERS, {
    variables: { params: { restaurantId, limit: 100, offset: 0 } },
    pollInterval: 60000,
    fetchPolicy: 'cache-and-network',
  })
  const { data: menuData } = useQuery(VIEW_RESTAURANT_MENU, {
    variables: { params: { restaurantId } },
    fetchPolicy: 'cache-first',
  })
  const [updateStatus, { loading: updating }] = useMutation(UPDATE_ORDER_STATUS)

  const itemNamesById = useMemo(() => {
    const menu = menuData?.viewRestaurantManu
    if (menu?.__typename !== 'RestaurantMenuType') return {}
    const map = {}
    for (const cat of menu.categories) for (const it of cat.items) map[it.itemId] = it.name
    return map
  }, [menuData])

  const result = data?.todayRestaurantOrders
  const ok = result?.__typename === 'OrderSummariesType'
  const all = ok ? result.orderSummaries : []
  const orders = all.filter((o) => filter === 'ALL' || o.status === filter)

  const counts = FILTERS.map((f) => ({
    ...f,
    n: f.value === 'ALL' ? all.length : all.filter((o) => o.status === f.value).length,
  }))

  const advance = async (o, status) => {
    setError('')
    const r = await updateStatus({ variables: { params: { orderId: o.orderId, status } } })
    const out = r.data?.updateOrderStatus
    if (out?.__typename === 'OrderType') {
      refetch()
    } else if (out?.__typename === 'InvalidOrderStatusTransition') {
      setError(`Invalid: ${out.currentStatus} → ${out.newStatus}. Allowed: ${(out.allowed || []).join(', ')}`)
    } else if (out?.__typename === 'UserNotRestaurantOwner') {
      setError('You are not the owner of this restaurant.')
    } else {
      setError('Status update failed: ' + (out?.__typename || 'unknown'))
    }
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--text-strong)', letterSpacing: -0.3 }}>
            Live orders
          </h2>
          <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>
            Today's queue — auto-refreshes every 12s.
          </div>
        </div>
        <button className="btn ghost sm" onClick={() => refetch()}>↻ Refresh</button>
      </div>

      {error && <div className="errbox">{error}</div>}

      <div className="pill-row">
        {counts.map((f) => (
          <div
            key={f.value}
            className={'pill' + (filter === f.value ? ' active brand' : '')}
            onClick={() => setFilter(f.value)}
          >
            {f.label} <span style={{
              background: filter === f.value ? 'rgba(255,255,255,0.25)' : '#f0f0f0',
              padding: '1px 7px',
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 800,
              marginLeft: 4,
            }}>{f.n}</span>
          </div>
        ))}
      </div>

      {loading && all.length === 0 && <div className="empty"><span className="spinner" /></div>}

      {!loading && !ok && result && (
        <div className="errbox">
          {result.__typename === 'UserNotRestaurantOwner' && 'You are not the owner of this restaurant.'}
        </div>
      )}

      {ok && orders.length === 0 && (
        <div className="empty">
          <div className="emoji">📭</div>
          <div className="empty-title">No orders here</div>
          <div>{filter === 'ALL' ? 'Nothing has been placed today yet.' : `No orders are in "${titleCase(filter)}" right now.`}</div>
        </div>
      )}

      <div className="order-list">
        {orders.map((o) => (
          <OrderCard
            key={o.orderId}
            order={o}
            itemNamesById={itemNamesById}
            updating={updating}
            onAdvance={advance}
          />
        ))}
      </div>
    </>
  )
}

function OrderCard({ order: o, itemNamesById, updating, onAdvance }) {
  const [expanded, setExpanded] = useState(false)
  const itemCount = o.items ? o.items.reduce((acc, it) => acc + (it.quantity || 0), 0) : 0
  const hasItems = o.items && o.items.length > 0
  const nameFor = (it) => itemNamesById[it.itemId] || `Item ${String(it.itemId).slice(0, 8)}…`

  return (
    <div className={'live-order ' + o.status}>
      <div className="row-1">
        <div>
          <div className="order-id">Order #{o.orderId.slice(0, 8).toUpperCase()}</div>
          <div className="customer">
            By {o.customerId.slice(0, 8)} · {fmtDate(o.placedAt)}
          </div>
        </div>
        <span className={'status-badge ' + o.status}>
          <span className="dot" /> {STATUS_DOT_TEXT[o.status] || titleCase(o.status)}
        </span>
      </div>

      {hasItems && (
        <div className="order-items-section">
          <button
            type="button"
            className="order-items-toggle"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
          >
            <span className="order-items-summary">
              {itemCount} {itemCount === 1 ? 'item' : 'items'} · <strong>{inr(o.finalAmount)}</strong>
            </span>
            <span className="order-items-toggle-link">
              <span className={'order-items-caret' + (expanded ? ' open' : '')}>▼</span>
              {expanded ? 'Hide items' : 'View items'}
            </span>
          </button>

          <div className={'order-items-collapse' + (expanded ? ' open' : '')}>
            <ul className="order-items">
              {o.items.map((it, idx) => (
                <li key={idx} className="order-item">
                  <span className="order-item-line">
                    {nameFor(it)} × {it.quantity} — {inr(it.itemPrice)}
                  </span>
                  <span className="order-item-subtotal">{inr(it.subtotal)}</span>
                </li>
              ))}
            </ul>
            <div className="order-items-total">
              <span>Order total</span>
              <span className="order-items-total-value">{inr(o.finalAmount)}</span>
            </div>
          </div>
        </div>
      )}

      {ADVANCE[o.status] && o.status !== 'CANCELLED' && (
        <div className="actions-row">
          <button
            className="action-pill primary"
            disabled={updating}
            onClick={() => onAdvance(o, ADVANCE[o.status])}
          >
            {ADVANCE_LABEL[o.status]} →
          </button>
          {o.status === 'PLACED' && (
            <button
              className="action-pill"
              disabled
              title="Owner-initiated cancellation isn't supported by the backend yet."
              style={{ opacity: 0.55 }}
            >
              ✕ Reject
            </button>
          )}
        </div>
      )}
    </div>
  )
}

