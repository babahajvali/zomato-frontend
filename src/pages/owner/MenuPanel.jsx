import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@apollo/client'
import {
  VIEW_RESTAURANT_MENU,
  CREATE_MENU_ITEMS,
  UPDATE_MENU_ITEM,
  DELETE_MENU_ITEM,
} from '../../graphql/operations.js'
import { titleCase } from '../../lib/format.js'
import { categoryEmoji } from '../../lib/restaurantUI.js'
import { useToast } from '../../components/Toast.jsx'

const CATEGORIES = [
  'STARTER', 'MAIN_COURSE', 'BREADS', 'RICE_AND_BIRYANI',
  'BEVERAGES', 'DESSERTS', 'SOUPS', 'SALADS', 'COMBO',
]

function emptyDraft() {
  return {
    name: '', description: '', price: '', category: 'STARTER',
    isVeg: true, isAvailable: true, preparationTimeInMinutes: 15, tags: '',
  }
}

export default function MenuPanel() {
  const { restaurantId } = useParams()
  const toast = useToast()

  const [showForm, setShowForm] = useState(false)
  const [drafts, setDrafts] = useState([emptyDraft()])
  const [filter, setFilter] = useState('ALL')

  const [editItem, setEditItem] = useState(null) // current item being edited
  const [editForm, setEditForm] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const { data, refetch } = useQuery(VIEW_RESTAURANT_MENU, {
    variables: { params: { restaurantId } },
    fetchPolicy: 'cache-and-network',
  })
  const [createMenuItems, { loading: creating }] = useMutation(CREATE_MENU_ITEMS)
  const [updateMenuItem, { loading: updatingItem }] = useMutation(UPDATE_MENU_ITEM)
  const [deleteMenuItem, { loading: deletingItem }] = useMutation(DELETE_MENU_ITEM)

  const menu = data?.viewRestaurantManu
  const allItems = useMemo(() => {
    if (menu?.__typename !== 'RestaurantMenuType') return []
    const out = []
    for (const c of menu.categories) for (const it of c.items) out.push(it)
    return out
  }, [menu])

  const items = filter === 'ALL' ? allItems : allItems.filter((it) => it.category === filter)

  const setRow = (i, patch) => setDrafts((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  const addRow = () => setDrafts((rows) => [...rows, emptyDraft()])
  const removeRow = (i) => setDrafts((rows) => (rows.length === 1 ? [emptyDraft()] : rows.filter((_, idx) => idx !== i)))

  const submit = async (e) => {
    e.preventDefault()
    const cleaned = drafts.filter((d) => d.name.trim()).map((d) => ({
      name: d.name.trim(),
      description: d.description.trim(),
      price: Number(d.price) || 0,
      category: d.category,
      isVeg: !!d.isVeg,
      isAvailable: !!d.isAvailable,
      preparationTimeInMinutes: Number(d.preparationTimeInMinutes) || 15,
      tags: (d.tags || '').split(',').map((s) => s.trim()).filter(Boolean),
    }))
    if (!cleaned.length) {
      toast.error('Add at least one item with a name.')
      return
    }
    const r = await createMenuItems({ variables: { params: { restaurantId, menuItems: cleaned } } })
    const out = r.data?.createMenuItems
    if (out?.__typename === 'MenuItemsType') {
      const n = out.menuItems.length
      toast.success(`Created ${n} item${n === 1 ? '' : 's'}`)
      setDrafts([emptyDraft()])
      setShowForm(false)
      refetch()
    } else if (out?.__typename === 'InvalidCategories') {
      toast.error('Invalid categories: ' + (out.categories || []).join(', '))
    } else if (out?.__typename === 'RestaurantNotFound') {
      toast.error('Restaurant not found.')
    } else if (out?.__typename === 'UserNotRestaurantOwner') {
      toast.error('You are not the owner of this restaurant.')
    } else {
      toast.error('Failed: ' + (out?.__typename || 'unknown'))
    }
  }

  const openEdit = (it) => {
    setEditItem(it)
    setEditForm({
      name: it.name || '',
      price: String(it.price ?? ''),
      preparationTimeInMinutes: String(it.preparationTimeInMinutes ?? 15),
      isAvailable: !!it.isAvailable,
      tags: (it.tags || []).join(', '),
    })
  }

  const closeEdit = () => {
    setEditItem(null)
    setEditForm(null)
  }

  const saveEdit = async () => {
    if (!editItem || !editForm) return
    if (!editForm.name.trim()) {
      toast.error('Name cannot be empty.')
      return
    }
    const params = {
      menuItemId: editItem.itemId,
      name: editForm.name.trim(),
      price: editForm.price === '' ? null : Number(editForm.price),
      preparationTimeInMinutes:
        editForm.preparationTimeInMinutes === '' ? null : Number(editForm.preparationTimeInMinutes),
      isAvailable: !!editForm.isAvailable,
      tags: editForm.tags
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    }
    const r = await updateMenuItem({ variables: { params } })
    const out = r.data?.updateMenuItem
    if (out?.__typename === 'MenuItemType') {
      toast.success(`Updated ${out.name}`)
      closeEdit()
      refetch()
    } else if (out?.__typename === 'MenuItemNotFound') {
      toast.error('Menu item not found.')
    } else if (out?.__typename === 'UserNotRestaurantOwner') {
      toast.error('You are not the owner of this restaurant.')
    } else {
      toast.error('Update failed: ' + (out?.__typename || 'unknown'))
    }
  }

  const onDelete = async () => {
    if (!confirmDelete) return
    const item = confirmDelete
    setConfirmDelete(null)
    const r = await deleteMenuItem({ variables: { params: { menuItemId: item.itemId } } })
    const out = r.data?.deleteMenuItem
    if (out?.__typename === 'DeleteMenuItemSuccessType') {
      toast.success(`Removed ${item.name}`)
      refetch()
    } else if (out?.__typename === 'MenuItemNotFound') {
      toast.error('Menu item not found.')
    } else if (out?.__typename === 'UserNotRestaurantOwner') {
      toast.error('You are not the owner of this restaurant.')
    } else {
      toast.error('Delete failed: ' + (out?.__typename || 'unknown'))
    }
  }

  const categoriesPresent = useMemo(() => {
    const set = new Set(allItems.map((it) => it.category))
    return ['ALL', ...Array.from(set)]
  }, [allItems])

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--text-strong)', letterSpacing: -0.3 }}>
            Menu management
          </h2>
          <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>
            {allItems.length} {allItems.length === 1 ? 'item' : 'items'} on the menu.
          </div>
        </div>
        <button className="btn" onClick={() => setShowForm((v) => !v)}>
          {showForm ? '← Back to menu' : '+ Add new item'}
        </button>
      </div>

      {showForm && (
        <form className="card card-pad" onSubmit={submit} style={{ marginBottom: 22 }}>
          <h3 style={{ marginTop: 0 }}>Add menu items</h3>
          {drafts.map((d, i) => (
            <div key={i} style={{ borderTop: i ? '1px dashed var(--border)' : 'none', paddingTop: i ? 14 : 0, marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <strong style={{ fontSize: 14 }}>Item #{i + 1}</strong>
                {drafts.length > 1 && (
                  <button type="button" className="btn subtle sm" onClick={() => removeRow(i)}>Remove</button>
                )}
              </div>
              <div className="row">
                <div className="field" style={{ marginBottom: 0 }}>
                  <label>Name</label>
                  <input className="input" value={d.name} onChange={(e) => setRow(i, { name: e.target.value })} placeholder="Paneer Tikka" required />
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label>Category</label>
                  <select className="select" value={d.category} onChange={(e) => setRow(i, { category: e.target.value })}>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{titleCase(c)}</option>)}
                  </select>
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label>Price (₹)</label>
                  <input type="number" min="0" step="0.01" className="input" value={d.price} onChange={(e) => setRow(i, { price: e.target.value })} placeholder="220" required />
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label>Prep time (min)</label>
                  <input type="number" min="1" className="input" value={d.preparationTimeInMinutes} onChange={(e) => setRow(i, { preparationTimeInMinutes: e.target.value })} />
                </div>
              </div>
              <div className="field" style={{ marginTop: 8, marginBottom: 0 }}>
                <label>Description</label>
                <input className="input" value={d.description} onChange={(e) => setRow(i, { description: e.target.value })} placeholder="Grilled paneer cubes, smoky and spiced" />
              </div>
              <div className="row" style={{ marginTop: 8 }}>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label>Tags (comma separated)</label>
                  <input className="input" value={d.tags} onChange={(e) => setRow(i, { tags: e.target.value })} placeholder="bestseller, spicy" />
                </div>
                <div className="field" style={{ marginBottom: 0, display: 'flex', gap: 14, alignItems: 'flex-end' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, textTransform: 'none', letterSpacing: 0, color: 'var(--text)', fontSize: 13 }}>
                    <input type="checkbox" checked={d.isVeg} onChange={(e) => setRow(i, { isVeg: e.target.checked })} />
                    Veg
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, textTransform: 'none', letterSpacing: 0, color: 'var(--text)', fontSize: 13 }}>
                    <input type="checkbox" checked={d.isAvailable} onChange={(e) => setRow(i, { isAvailable: e.target.checked })} />
                    Available
                  </label>
                </div>
              </div>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button type="button" className="btn ghost sm" onClick={addRow}>+ Add another row</button>
            <button className="btn" type="submit" disabled={creating}>
              {creating ? 'Saving…' : 'Save items'}
            </button>
          </div>
        </form>
      )}

      <div className="pill-row" style={{ marginBottom: 16 }}>
        {categoriesPresent.map((c) => (
          <div
            key={c}
            className={'pill' + (filter === c ? ' active brand' : '')}
            onClick={() => setFilter(c)}
          >
            {c === 'ALL' ? 'All' : titleCase(c)}
          </div>
        ))}
      </div>

      {items.length === 0 && (
        <div className="empty">
          <div className="emoji">🍽️</div>
          <div className="empty-title">No items here yet</div>
          <div>Click "Add new item" to start building your menu.</div>
        </div>
      )}

      <div className="menu-grid">
        {items.map((it) => (
          <div key={it.itemId} className="item-card">
            <div className="thumb" style={{
              background: it.isVeg
                ? 'linear-gradient(135deg, #d6f4d0 0%, #a8e69a 100%)'
                : 'linear-gradient(135deg, #ffe2cc 0%, #ffcfa3 100%)',
              opacity: it.isAvailable ? 1 : 0.45,
            }}>
              {categoryEmoji(it.category)}
            </div>
            <div className="body">
              <div className="head">
                <div className="name">
                  <span className={'veg-mark' + (it.isVeg ? '' : ' non-veg')} aria-hidden />
                  {it.name}
                </div>
                <div className="price">₹{Number(it.price).toFixed(0)}</div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <span className="tag">{titleCase(it.category)}</span>
                <span className="tag">⏱ {it.preparationTimeInMinutes}m</span>
              </div>
              {it.description && <p className="desc">{it.description}</p>}
              <div className="footer">
                <span style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: it.isAvailable ? 'var(--green-dark)' : 'var(--muted)',
                }}>
                  {it.isAvailable ? '● Available' : '○ Unavailable'}
                </span>
                <div className="item-actions">
                  <button className="icon-btn" onClick={() => openEdit(it)}>✎ Edit</button>
                  <button
                    className="icon-btn danger"
                    disabled={deletingItem}
                    onClick={() => setConfirmDelete(it)}
                  >
                    🗑 Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {editItem && editForm && (
        <div className="modal-overlay" onClick={closeEdit}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Edit menu item</h3>
              <button className="modal-close" onClick={closeEdit}>×</button>
            </div>
            <div className="modal-body">
              <div className="field">
                <label>Name</label>
                <input
                  className="input"
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="row">
                <div className="field" style={{ marginBottom: 0 }}>
                  <label>Price (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="input"
                    value={editForm.price}
                    onChange={(e) => setEditForm((f) => ({ ...f, price: e.target.value }))}
                  />
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label>Prep time (min)</label>
                  <input
                    type="number"
                    min="1"
                    className="input"
                    value={editForm.preparationTimeInMinutes}
                    onChange={(e) => setEditForm((f) => ({ ...f, preparationTimeInMinutes: e.target.value }))}
                  />
                </div>
              </div>
              <div className="field" style={{ marginTop: 14 }}>
                <label>Tags (comma separated)</label>
                <input
                  className="input"
                  value={editForm.tags}
                  onChange={(e) => setEditForm((f) => ({ ...f, tags: e.target.value }))}
                  placeholder="bestseller, spicy"
                />
              </div>
              <label
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, marginTop: 6,
                  fontSize: 14, fontWeight: 600, color: 'var(--text-strong)',
                }}
              >
                <span className="switch">
                  <input
                    type="checkbox"
                    checked={!!editForm.isAvailable}
                    onChange={(e) => setEditForm((f) => ({ ...f, isAvailable: e.target.checked }))}
                  />
                  <span className="slider" />
                </span>
                Available for ordering
              </label>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                Item ID #{editItem.itemId.slice(0, 8)}…
              </div>
              <div className="modal-actions">
                <button className="btn subtle" onClick={closeEdit} disabled={updatingItem}>Cancel</button>
                <button className="btn" onClick={saveEdit} disabled={updatingItem}>
                  {updatingItem ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Delete "{confirmDelete.name}"?</h3>
              <button className="modal-close" onClick={() => setConfirmDelete(null)}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.5 }}>
                This item will be removed from your menu. Customers won't see it anymore,
                and existing orders won't be affected.
              </p>
              <div className="modal-actions">
                <button className="btn subtle" onClick={() => setConfirmDelete(null)}>Cancel</button>
                <button className="btn danger" disabled={deletingItem} onClick={onDelete}>
                  {deletingItem ? 'Deleting…' : 'Yes, delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
