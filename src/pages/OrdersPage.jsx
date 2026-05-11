import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@apollo/client'
import { Link } from 'react-router-dom'
import {
  CANCEL_ORDER,
  USER_ORDERS,
  USER_SCHEDULED_ORDERS,
} from '../graphql/operations.js'
import { inr, fmtDate, fmtScheduled } from '../lib/format.js'
import { useToast } from '../components/Toast.jsx'

const CANCEL_ERROR_MESSAGES = {
  OrderNotFound: 'This order could not be found.',
  OrderNotOwnedByUser: 'You are not allowed to cancel this order.',
  OrderCancellationWindowExpired: 'The cancellation window for this order has expired.',
  OrderCancellationNotAllowed: 'This order can no longer be cancelled.',
  OrderAlreadyCancelled: 'This order has already been cancelled.',
}

export default function OrdersPage() {
  const [tab, setTab] = useState('history')
  const [confirmCancel, setConfirmCancel] = useState(null)
  const toast = useToast()

  const { data: ordersData, loading: ordersLoading, error: ordersError } = useQuery(USER_ORDERS, {
    variables: { params: { limit: 50, offset: 0 } },
    fetchPolicy: 'cache-and-network',
  })
  const {
    data: scheduledData,
    loading: schedLoading,
    error: schedError,
    refetch: refetchScheduled,
  } = useQuery(USER_SCHEDULED_ORDERS, {
    variables: { params: { limit: 50, offset: 0 } },
    fetchPolicy: 'cache-and-network',
  })

  const [cancelOrder, { loading: cancelling }] = useMutation(CANCEL_ORDER)

  const handleConfirmCancel = async () => {
    if (!confirmCancel) return
    const orderId = confirmCancel.orderId
    try {
      const { data } = await cancelOrder({
        variables: { params: { orderId } },
      })
      const result = data?.cancelOrder
      if (result?.__typename === 'OrderType') {
        setConfirmCancel(null)
        toast.success('Your scheduled order has been cancelled successfully')
        await refetchScheduled()
      } else {
        const msg =
          CANCEL_ERROR_MESSAGES[result?.__typename] ||
          'Could not cancel this scheduled order.'
        toast.error(msg)
      }
    } catch (err) {
      toast.error(err?.message || 'Could not cancel this scheduled order.')
    }
  }

  const allOrders = ordersData?.userOrders?.__typename === 'OrdersType'
    ? ordersData.userOrders.orders
    : []

  const allScheduled = useMemo(() => {
    const list = scheduledData?.userScheduledOrders
    if (list?.__typename !== 'ScheduledOrderSummariesType') return []
    return list.orderSummaries || []
  }, [scheduledData])

  const upcomingScheduled = useMemo(() => {
    return [...allScheduled]
      .filter((o) => o.status === 'SCHEDULED')
      .sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime())
  }, [allScheduled])

  // Map of orderId -> scheduledFor, used to surface the scheduled time on
  // history cards for orders that were originally scheduled.
  const scheduledTimeById = useMemo(() => {
    const map = {}
    for (const o of allScheduled) map[o.orderId] = o.scheduledFor
    return map
  }, [allScheduled])

  // History excludes orders still in SCHEDULED status — those live in the
  // Scheduled tab. Activated/delivered/cancelled orders all appear here.
  const historyOrders = useMemo(
    () => allOrders.filter((o) => o.status !== 'SCHEDULED'),
    [allOrders],
  )

  const isLoading = (tab === 'scheduled' ? schedLoading : ordersLoading)
  const tabError = tab === 'scheduled' ? schedError : ordersError

  return (
    <>
      <h1 className="page-title">Your orders</h1>

      <div className="tabs" role="tablist" aria-label="Orders tabs">
        <button
          role="tab"
          aria-selected={tab === 'scheduled'}
          className={'tab-btn' + (tab === 'scheduled' ? ' active' : '')}
          onClick={() => setTab('scheduled')}
        >
          Scheduled orders
          {upcomingScheduled.length > 0 && (
            <span className="tab-count">{upcomingScheduled.length}</span>
          )}
        </button>
        <button
          role="tab"
          aria-selected={tab === 'history'}
          className={'tab-btn' + (tab === 'history' ? ' active' : '')}
          onClick={() => setTab('history')}
        >
          Order history
        </button>
      </div>

      {isLoading && <div className="empty"><span className="spinner" /></div>}
      {tabError && <div className="errbox">{tabError.message}</div>}

      {tab === 'scheduled' ? (
        <ScheduledList
          orders={upcomingScheduled}
          loading={schedLoading}
          onCancel={(order) => setConfirmCancel(order)}
        />
      ) : (
        <HistoryList
          orders={historyOrders}
          loading={ordersLoading}
          scheduledTimeById={scheduledTimeById}
        />
      )}

      {confirmCancel && (
        <div
          className="modal-overlay"
          onClick={() => !cancelling && setConfirmCancel(null)}
        >
          <div className="modal-card cancel-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-body">
              <h3 className="cancel-dialog-title">Cancel scheduled order?</h3>
              <p className="cancel-dialog-text">
                Are you sure you want to cancel this scheduled order?
              </p>
              <div className="modal-actions">
                <button
                  className="btn subtle"
                  disabled={cancelling}
                  onClick={() => setConfirmCancel(null)}
                >
                  Go Back
                </button>
                <button
                  className="btn danger"
                  disabled={cancelling}
                  onClick={handleConfirmCancel}
                >
                  {cancelling ? 'Cancelling…' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function ScheduledList({ orders, loading, onCancel }) {
  if (loading && orders.length === 0) return null
  if (orders.length === 0) {
    return (
      <div className="empty">
        <div className="emoji">📅</div>
        <div>You have no upcoming scheduled orders.</div>
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {orders.map((o) => (
        <Link key={o.orderId} to={`/orders/${o.orderId}`} className="order-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 12,
              background: 'linear-gradient(135deg, #d6e4fb, #b6cef7)',
              display: 'grid', placeItems: 'center', fontSize: 24, flexShrink: 0,
            }}>📅</div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontWeight: 700, color: 'var(--text-strong)', fontSize: 15 }}>
                Order #{o.orderId.slice(0, 8).toUpperCase()}
              </div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
                {itemsSummary(o.items)}
              </div>
              <div className="scheduled-time">
                Scheduled for <strong>{fmtScheduled(o.scheduledFor)}</strong>
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap' }}>
              <span className="scheduled-badge">Scheduled</span>
              <div className={'status ' + o.status}>{o.status.replace(/_/g, ' ')}</div>
            </div>
            <div style={{ marginTop: 6, fontWeight: 800, fontSize: 16, color: 'var(--text-strong)' }}>
              {inr(o.finalAmount)}
            </div>
            {o.status === 'SCHEDULED' && (
              <button
                type="button"
                className="cancel-pill-btn"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onCancel?.(o)
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </Link>
      ))}
    </div>
  )
}

function HistoryList({ orders, loading, scheduledTimeById }) {
  if (loading && orders.length === 0) return null
  if (orders.length === 0) {
    return (
      <div className="empty">
        <div className="emoji">📦</div>
        <div>You haven't placed any orders yet.</div>
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {orders.map((o) => {
        const scheduledFor = scheduledTimeById?.[o.orderId]
        const isScheduled = Boolean(scheduledFor)
        return (
          <Link key={o.orderId} to={`/orders/${o.orderId}`} className="order-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1 }}>
              <div style={{
                width: 52, height: 52, borderRadius: 12,
                background: isScheduled
                  ? 'linear-gradient(135deg, #d6e4fb, #b6cef7)'
                  : 'linear-gradient(135deg, #ffe2cc, #ffcfa3)',
                display: 'grid', placeItems: 'center', fontSize: 24, flexShrink: 0,
              }}>{isScheduled ? '📅' : '📦'}</div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 700, color: 'var(--text-strong)', fontSize: 15 }}>
                  Order #{o.orderId.slice(0, 8).toUpperCase()}
                </div>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>{fmtDate(o.placedAt)}</div>
                {isScheduled && (
                  <div className="scheduled-time">
                    Scheduled for <strong>{fmtScheduled(scheduledFor)}</strong>
                  </div>
                )}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap' }}>
                {isScheduled && <span className="scheduled-badge">Scheduled</span>}
                <div className={'status ' + o.status}>{o.status.replace(/_/g, ' ')}</div>
              </div>
              <div style={{ marginTop: 6, fontWeight: 800, fontSize: 16, color: 'var(--text-strong)' }}>
                {inr(o.finalAmount)}
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}

function itemsSummary(items) {
  if (!items || items.length === 0) return '—'
  const totalQty = items.reduce((acc, it) => acc + (it.quantity || 0), 0)
  return `${items.length} ${items.length === 1 ? 'item' : 'items'} · ${totalQty} ${totalQty === 1 ? 'unit' : 'units'}`
}
