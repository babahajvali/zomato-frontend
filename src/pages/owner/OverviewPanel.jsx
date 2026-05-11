import { useMemo } from 'react'
import { useOutletContext, useParams } from 'react-router-dom'
import { useQuery } from '@apollo/client'
import {
  GET_RESTAURANT_DASHBOARD,
  VIEW_RESTAURANT_MENU,
} from '../../graphql/operations.js'
import { inr } from '../../lib/format.js'

const NOW = new Date()
const todayStr = NOW.toISOString().slice(0, 10)
const monthAgoStr = new Date(NOW.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

export default function OverviewPanel() {
  const { restaurantId } = useParams()
  useOutletContext()

  const { data: dash, loading } = useQuery(GET_RESTAURANT_DASHBOARD, {
    variables: { params: { restaurantId, dateFrom: monthAgoStr, dateTo: todayStr } },
    fetchPolicy: 'cache-and-network',
  })
  const { data: menuData } = useQuery(VIEW_RESTAURANT_MENU, {
    variables: { params: { restaurantId } },
    fetchPolicy: 'cache-and-network',
  })

  const dashboard = dash?.getRestaurantDashboard?.__typename === 'RestaurantDashboardType'
    ? dash.getRestaurantDashboard
    : null

  const menuItemMap = useMemo(() => {
    const map = new Map()
    const m = menuData?.viewRestaurantManu
    if (m?.__typename !== 'RestaurantMenuType') return map
    for (const c of m.categories || []) {
      for (const it of c.items || []) {
        map.set(String(it.itemId), it.name)
      }
    }
    return map
  }, [menuData])

  if (!dashboard) {
    return (
      <div className="ov2">
        <div className="ov2-intro">
          <h2>Overview</h2>
          <p>{loading ? 'Loading dashboard…' : 'No dashboard data available.'}</p>
        </div>
      </div>
    )
  }

  const summary = dashboard.summary
  const ratingSummary = dashboard.ratingSummary
  const ordersByStatus = dashboard.ordersByStatus || []
  const peakHours = dashboard.peakHours || []
  const topSelling = dashboard.topSelling || []

  return (
    <div className="ov2">
      <div className="ov2-intro">
        <h2>Overview</h2>
        <p>Last 30 days · sourced live from getRestaurantDashboard.</p>
      </div>

      {/* ─── Metric cards ─── */}
      <div className="dash-metrics">
        <DashMetricCard
          delay={0.05}
          icon="📦"
          iconClass="orange"
          label="Total Orders"
          value={Number(summary.totalOrders || 0).toLocaleString('en-IN')}
        />
        <DashMetricCard
          delay={0.12}
          icon="💰"
          iconClass="green"
          label="Total Revenue"
          value={`₹${Number(summary.totalRevenue || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`}
        />
        <DashMetricCard
          delay={0.19}
          icon="🧾"
          iconClass="amber"
          label="Avg Order Value"
          value={`₹${Number(summary.avgOrderValue || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`}
        />
        <DashMetricCard
          delay={0.26}
          icon="📉"
          iconClass="red"
          label="Cancellation Rate"
          value={`${Number(summary.cancellationRate || 0).toFixed(1)}%`}
        />
        <DashMetricCard
          delay={0.33}
          icon="🚫"
          iconClass="grey"
          label="Total Cancelled"
          value={Number(summary.totalCancelled || 0).toLocaleString('en-IN')}
        />
      </div>

      {/* ─── Rating Summary + Orders By Status ─── */}
      <div className="dash-row-2">
        <RatingSummaryCard ratingSummary={ratingSummary} />
        <OrdersByStatusCard items={ordersByStatus} />
      </div>

      {/* ─── Peak Hours ─── */}
      <PeakHoursCard peakHours={peakHours} />

      {/* ─── Top Selling Items ─── */}
      <TopSellingCard items={topSelling} menuItemMap={menuItemMap} />
    </div>
  )
}

/* ─── Metric Card ─── */

function DashMetricCard({ icon, iconClass, label, value, delay }) {
  return (
    <div className="dash-metric" style={{ animationDelay: `${delay}s` }}>
      <div className="dash-metric-top">
        <div className={`dash-icon ${iconClass}`}>{icon}</div>
        <span className="dash-metric-label">{label}</span>
      </div>
      <div className="dash-metric-value">{value}</div>
    </div>
  )
}

/* ─── Rating Summary Card ─── */

function RatingSummaryCard({ ratingSummary }) {
  const avg = Number(ratingSummary?.averageRating || 0)
  const total = Number(ratingSummary?.totalReviews || 0)
  const distribution = ratingSummary?.distribution || {}

  const max = Math.max(
    1,
    ...[1, 2, 3, 4, 5].map((s) => Number(distribution[String(s)] ?? distribution[s] ?? 0)),
  )

  return (
    <div className="dash-card dash-rating" style={{ animationDelay: '0.40s' }}>
      <div className="dash-card-head">
        <h3>Rating Summary</h3>
      </div>
      <div className="dash-rating-body">
        <div className="dash-rating-hero">
          <div className="dash-rating-num">
            <span className="star">★</span>
            <span className="val">{avg.toFixed(1)}</span>
          </div>
          <div className="dash-rating-meta">
            <span className="dash-rating-total">{total.toLocaleString('en-IN')}</span>
            <span className="dash-rating-total-label">Total Reviews</span>
          </div>
        </div>
        <div className="dash-rating-dist">
          {[5, 4, 3, 2, 1].map((s) => {
            const count = Number(distribution[String(s)] ?? distribution[s] ?? 0)
            const pct = (count / max) * 100
            return (
              <div className="dash-rating-row" key={s}>
                <span className="dash-rating-star-label">{s}<span className="mini-star">★</span></span>
                <div className="dash-rating-bar-track">
                  <div className="dash-rating-bar-fill" style={{ width: `${pct}%` }} />
                </div>
                <span className="dash-rating-count">{count}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ─── Orders By Status ─── */

const STATUS_BADGE = {
  DELIVERED:       { cls: 'delivered', label: 'Delivered' },
  CANCELLED:       { cls: 'cancelled', label: 'Cancelled' },
  PLACED:          { cls: 'placed',    label: 'Placed' },
  PREPARING:       { cls: 'preparing', label: 'Preparing' },
  CONFIRMED:       { cls: 'confirmed', label: 'Confirmed' },
  OUT_OF_DELIVERY: { cls: 'out',       label: 'Out for Delivery' },
}

function OrdersByStatusCard({ items }) {
  return (
    <div className="dash-card" style={{ animationDelay: '0.47s' }}>
      <div className="dash-card-head">
        <h3>Orders by Status</h3>
        <span className="dash-card-sub">Distribution across statuses</span>
      </div>
      {items.length === 0 ? (
        <div className="dash-empty">No orders in this range.</div>
      ) : (
        <div className="dash-status-grid">
          {items.map((it) => {
            const meta = STATUS_BADGE[it.status] || { cls: 'other', label: it.status }
            return (
              <div className={`dash-status-pill ${meta.cls}`} key={it.status}>
                <span className="dash-status-dot" />
                <span className="dash-status-label">{meta.label}</span>
                <span className="dash-status-count">{it.count}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ─── Peak Hours Chart ─── */

function PeakHoursCard({ peakHours }) {
  const sorted = useMemo(
    () => [...peakHours].sort((a, b) => Number(a.hour) - Number(b.hour)),
    [peakHours],
  )
  const max = Math.max(1, ...sorted.map((p) => Number(p.orderCount || 0)))

  return (
    <div className="dash-card" style={{ animationDelay: '0.54s' }}>
      <div className="dash-card-head">
        <h3>Peak Hours</h3>
        <span className="dash-card-sub">Order volume by hour of day</span>
      </div>
      {sorted.length === 0 ? (
        <div className="dash-empty">No peak-hour data available.</div>
      ) : (
        <div className="dash-peak-bars" role="img" aria-label="Peak hours order count">
          {sorted.map((p) => {
            const count = Number(p.orderCount || 0)
            const pct = (count / max) * 100
            return (
              <div className="dash-peak-col" key={p.hour}>
                <div className="dash-peak-tip">
                  {formatHour(p.hour)} · {count} order{count === 1 ? '' : 's'}
                </div>
                <div
                  className={'dash-peak-bar' + (count <= 0 ? ' zero' : '')}
                  style={{ height: count <= 0 ? 4 : `${Math.max(6, pct)}%` }}
                />
                <span className="dash-peak-label">{formatHour(p.hour)}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ─── Top Selling Items ─── */

function TopSellingCard({ items, menuItemMap }) {
  return (
    <div className="dash-card" style={{ animationDelay: '0.61s' }}>
      <div className="dash-card-head">
        <h3>Top Selling Items</h3>
        <span className="dash-card-sub">Best performers in the last 30 days</span>
      </div>
      {items.length === 0 ? (
        <div className="dash-empty">No items sold in this range.</div>
      ) : (
        <div className="dash-top-grid">
          {items.map((it, idx) => {
            const name = menuItemMap.get(String(it.menuItemId)) || `Item ${String(it.menuItemId).slice(0, 8)}`
            return (
              <div className="dash-top-card" key={it.menuItemId} style={{ animationDelay: `${0.66 + idx * 0.05}s` }}>
                <div className="dash-top-rank">#{idx + 1}</div>
                <div className="dash-top-body">
                  <div className="dash-top-name" title={name}>{name}</div>
                  <div className="dash-top-stats">
                    <span className="dash-top-stat">
                      <span className="dash-top-stat-label">Sold</span>
                      <span className="dash-top-stat-value">{Number(it.quantity || 0).toLocaleString('en-IN')}</span>
                    </span>
                    <span className="dash-top-stat">
                      <span className="dash-top-stat-label">Revenue</span>
                      <span className="dash-top-stat-value">₹{Number(it.revenue || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ─── Helpers ─── */

function formatHour(h) {
  const hr = Number(h)
  if (!Number.isFinite(hr)) return '—'
  if (hr === 0) return '12AM'
  if (hr === 12) return '12PM'
  return hr < 12 ? `${hr}AM` : `${hr - 12}PM`
}
