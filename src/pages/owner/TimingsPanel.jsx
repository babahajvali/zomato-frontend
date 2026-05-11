import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@apollo/client'
import {
  GET_RESTAURANT_TIMINGS,
  CREATE_RESTAURANT_TIMING,
  UPDATE_RESTAURANT_TIMING,
  DELETE_RESTAURANT_TIMING,
} from '../../graphql/operations.js'
import { useToast } from '../../components/Toast.jsx'

const DAY_LABELS = [
  '',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
]
const WEEK = [1, 2, 3, 4, 5, 6, 7]

const DEFAULT_OPEN = '09:00'
const DEFAULT_CLOSE = '22:00'

function trimSeconds(t) {
  if (!t) return ''
  return t.length >= 5 ? t.slice(0, 5) : t
}

function withSeconds(t) {
  if (!t) return null
  return t.length === 5 ? t + ':00' : t
}

export default function TimingsPanel() {
  const { restaurantId } = useParams()
  const toast = useToast()

  const { data, loading, refetch } = useQuery(GET_RESTAURANT_TIMINGS, {
    variables: { params: { restaurantId } },
    fetchPolicy: 'cache-and-network',
  })
  const [createTiming, { loading: creating }] = useMutation(CREATE_RESTAURANT_TIMING)
  const [updateTiming, { loading: updating }] = useMutation(UPDATE_RESTAURANT_TIMING)
  const [deleteTiming, { loading: deleting }] = useMutation(DELETE_RESTAURANT_TIMING)

  const [draft, setDraft] = useState({})
  const [confirm, setConfirm] = useState(null)

  const list = data?.getRestaurantTimings
  const isList = list?.__typename === 'RestaurantTimingsListType'
  const timings = isList ? list.timings : []

  const byDay = useMemo(() => {
    const m = {}
    for (const t of timings) m[t.dayOfWeek] = t
    return m
  }, [timings])

  const editingDay = (day) => draft[day] !== undefined
  const startEdit = (day) => {
    const t = byDay[day]
    setDraft((d) => ({
      ...d,
      [day]: {
        openTime: trimSeconds(t?.openTime) || DEFAULT_OPEN,
        closeTime: trimSeconds(t?.closeTime) || DEFAULT_CLOSE,
      },
    }))
  }
  const cancelEdit = (day) =>
    setDraft(({ [day]: _drop, ...rest }) => rest)
  const setEdit = (day, patch) =>
    setDraft((d) => ({ ...d, [day]: { ...(d[day] || {}), ...patch } }))

  const validate = (e) => {
    if (!e?.openTime || !e?.closeTime) return 'Both open and close times are required.'
    if (e.openTime >= e.closeTime) return 'Open time must be before close time.'
    return null
  }

  const onSave = async (day) => {
    const e = draft[day]
    const err = validate(e)
    if (err) {
      toast.error(err)
      return
    }
    const existing = byDay[day]
    try {
      if (existing) {
        const r = await updateTiming({
          variables: {
            params: {
              timingId: existing.id,
              openTime: withSeconds(e.openTime),
              closeTime: withSeconds(e.closeTime),
            },
          },
        })
        const out = r.data?.updateRestaurantTiming
        if (out?.__typename === 'RestaurantTimingType') {
          toast.success(`Updated ${DAY_LABELS[day]} hours`)
          cancelEdit(day)
          refetch()
        } else {
          toast.error(prettyTimingError(out))
        }
      } else {
        const r = await createTiming({
          variables: {
            params: {
              restaurantId,
              dayOfWeek: day,
              openTime: withSeconds(e.openTime),
              closeTime: withSeconds(e.closeTime),
            },
          },
        })
        const out = r.data?.createRestaurantTiming
        if (out?.__typename === 'RestaurantTimingType') {
          toast.success(`${DAY_LABELS[day]} now open ${e.openTime} – ${e.closeTime}`)
          cancelEdit(day)
          refetch()
        } else {
          toast.error(prettyTimingError(out))
        }
      }
    } catch (ex) {
      toast.error('Network error. Please try again.')
    }
  }

  const onDelete = async () => {
    if (!confirm) return
    const day = confirm.dayOfWeek
    const id = confirm.id
    setConfirm(null)
    try {
      const r = await deleteTiming({ variables: { params: { timingId: id } } })
      const out = r.data?.deleteRestaurantTiming
      if (out?.__typename === 'DeleteRestaurantTimingSuccessType') {
        toast.success(`${DAY_LABELS[day]} marked closed`)
        refetch()
      } else {
        toast.error(prettyTimingError(out))
      }
    } catch (ex) {
      toast.error('Network error. Please try again.')
    }
  }

  const saveAll = async () => {
    const days = Object.keys(draft).map(Number)
    if (!days.length) {
      toast.info('Nothing to save')
      return
    }
    let ok = 0
    let fail = 0
    for (const day of days) {
      const e = draft[day]
      const err = validate(e)
      if (err) { fail++; continue }
      const existing = byDay[day]
      try {
        if (existing) {
          const r = await updateTiming({
            variables: {
              params: {
                timingId: existing.id,
                openTime: withSeconds(e.openTime),
                closeTime: withSeconds(e.closeTime),
              },
            },
          })
          if (r.data?.updateRestaurantTiming?.__typename === 'RestaurantTimingType') ok++
          else fail++
        } else {
          const r = await createTiming({
            variables: {
              params: {
                restaurantId,
                dayOfWeek: day,
                openTime: withSeconds(e.openTime),
                closeTime: withSeconds(e.closeTime),
              },
            },
          })
          if (r.data?.createRestaurantTiming?.__typename === 'RestaurantTimingType') ok++
          else fail++
        }
      } catch (ex) { fail++ }
    }
    if (ok) toast.success(`Saved ${ok} day${ok === 1 ? '' : 's'}`)
    if (fail) toast.error(`${fail} change${fail === 1 ? '' : 's'} failed`)
    setDraft({})
    refetch()
  }

  const dirtyCount = Object.keys(draft).length
  const busy = creating || updating || deleting

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--text-strong)', letterSpacing: -0.3 }}>
            Operating hours
          </h2>
          <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>
            Set when your restaurant accepts orders. Days without timings are treated as closed.
          </div>
        </div>
        <button
          className="btn"
          onClick={saveAll}
          disabled={busy || dirtyCount === 0}
          title={dirtyCount === 0 ? 'No pending changes' : `Save ${dirtyCount} pending change${dirtyCount === 1 ? '' : 's'}`}
        >
          {busy ? 'Saving…' : `Save all${dirtyCount ? ` (${dirtyCount})` : ''}`}
        </button>
      </div>

      {loading && !timings.length && (
        <div className="empty"><span className="spinner" /></div>
      )}

      {list?.__typename === 'RestaurantNotFound' && (
        <div className="errbox">Restaurant not found.</div>
      )}

      <div className="week-schedule">
        {WEEK.map((day) => {
          const t = byDay[day]
          const open = !!t
          const editing = editingDay(day)
          const e = draft[day]
          const label = DAY_LABELS[day]
          return (
            <div key={day} className={'week-row' + (open ? '' : ' closed')}>
              <div className="week-day-bubble">{label.slice(0, 3)}</div>
              <div className="week-day-info">
                <div className="week-day-name">{label}</div>
                <div className="week-day-sub">
                  {open ? `Slot #${t.id}` : 'Closed all day'}
                </div>
              </div>

              {!editing && open && (
                <div className="timing-pill">
                  <span aria-hidden>🕒</span>
                  {trimSeconds(t.openTime)} – {trimSeconds(t.closeTime)}
                </div>
              )}
              {!editing && !open && (
                <div className="closed-badge">● Closed</div>
              )}
              {editing && (
                <div className="time-input-group">
                  <input
                    type="time"
                    className="input"
                    value={e.openTime || ''}
                    onChange={(ev) => setEdit(day, { openTime: ev.target.value })}
                  />
                  <span style={{ color: 'var(--muted)', fontWeight: 700 }}>—</span>
                  <input
                    type="time"
                    className="input"
                    value={e.closeTime || ''}
                    onChange={(ev) => setEdit(day, { closeTime: ev.target.value })}
                  />
                </div>
              )}

              <div className="item-actions">
                {!editing && open && (
                  <>
                    <button className="icon-btn" onClick={() => startEdit(day)}>Edit</button>
                    <button
                      className="icon-btn danger"
                      disabled={busy}
                      onClick={() => setConfirm({ dayOfWeek: day, id: t.id })}
                    >
                      Remove
                    </button>
                  </>
                )}
                {!editing && !open && (
                  <button className="btn ghost sm" onClick={() => startEdit(day)}>+ Set hours</button>
                )}
                {editing && (
                  <>
                    <button className="btn sm" disabled={busy} onClick={() => onSave(day)}>
                      {busy ? 'Saving…' : 'Save'}
                    </button>
                    <button className="btn subtle sm" onClick={() => cancelEdit(day)}>Cancel</button>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {confirm && (
        <div className="modal-overlay" onClick={() => setConfirm(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Mark {DAY_LABELS[confirm.dayOfWeek]} as closed?</h3>
              <button className="modal-close" onClick={() => setConfirm(null)}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.5 }}>
                Customers won't be able to place orders on {DAY_LABELS[confirm.dayOfWeek]}.
                You can re-add hours anytime from this screen.
              </p>
              <div className="modal-actions">
                <button className="btn subtle" onClick={() => setConfirm(null)}>Cancel</button>
                <button className="btn danger" disabled={deleting} onClick={onDelete}>
                  {deleting ? 'Closing…' : 'Yes, Remove'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function prettyTimingError(out) {
  if (!out) return 'Unable to save timing.'
  switch (out.__typename) {
    case 'InvalidTimingRange':
      return 'Open time must be before close time.'
    case 'RestaurantTimingNotFound':
      return 'Timing slot not found.'
    case 'RestaurantNotFound':
      return 'Restaurant not found.'
    case 'UserNotRestaurantOwner':
      return 'You are not the owner of this restaurant.'
    default:
      return 'Failed: ' + out.__typename
  }
}
