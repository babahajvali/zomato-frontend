export const inr = (n) => {
  const v = Number(n ?? 0)
  return '₹' + v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export const titleCase = (s) =>
  String(s || '')
    .split('_')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join(' ')

export const fmtDate = (s) => {
  if (!s) return ''
  try {
    const d = new Date(s)
    if (isNaN(d.getTime())) return s
    return d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return s
  }
}

export const fmtScheduled = (s) => {
  if (!s) return ''
  const d = new Date(s)
  if (isNaN(d.getTime())) return s
  const time = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })
  const startOfDay = (x) => { const c = new Date(x); c.setHours(0, 0, 0, 0); return c }
  const today = startOfDay(new Date())
  const target = startOfDay(d)
  const diffDays = Math.round((target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
  if (diffDays === 0) return `Today, ${time}`
  if (diffDays === 1) return `Tomorrow, ${time}`
  if (diffDays === -1) return `Yesterday, ${time}`
  const datePart = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  return `${datePart}, ${time}`
}
