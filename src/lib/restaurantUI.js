// Deterministic mock fields the backend doesn't provide (delivery time,
// min order, offers) — derived from the restaurant id so each restaurant
// always shows the same numbers across renders.

function hash(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0
  return Math.abs(h)
}

export function deliveryMinutes(id) {
  return 20 + (hash(id || '') % 30) // 20–49 min
}

export function minOrder(id) {
  const opts = [99, 149, 199, 249]
  return opts[hash(id || '') % opts.length]
}

export function priceForTwo(id) {
  const opts = [200, 300, 400, 500, 600, 700]
  return opts[hash((id || '') + 'p2') % opts.length]
}

const OFFER_BANK = [
  { tag: '20% OFF', sub: 'up to ₹100', code: 'SAVE20' },
  { tag: 'FLAT ₹100 OFF', sub: 'on orders above ₹500', code: 'FLAT100' },
  { tag: '50% OFF', sub: 'up to ₹150 · WELCOME50', code: 'WELCOME50' },
  { tag: '30% OFF', sub: 'orders above ₹400', code: 'MEGADEAL' },
  null, // some restaurants have no offer
  null,
]

export function offerFor(id) {
  return OFFER_BANK[hash((id || '') + 'offer') % OFFER_BANK.length]
}

export function cuisineEmoji(cuisine) {
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

export function categoryEmoji(category) {
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

export const CUISINES = [
  { value: '',             label: 'All',          emoji: '🍽️', tint: '#fff7ed' },
  { value: 'NORTH_INDIAN', label: 'North Indian', emoji: '🍛', tint: '#ffe2cc' },
  { value: 'SOUTH_INDIAN', label: 'South Indian', emoji: '🥘', tint: '#fff4cc' },
  { value: 'CHINESE',      label: 'Chinese',      emoji: '🥡', tint: '#fee2e2' },
  { value: 'ITALIAN',      label: 'Pizzas',       emoji: '🍕', tint: '#fff4cc' },
  { value: 'FAST_FOOD',    label: 'Burgers',      emoji: '🍔', tint: '#ffd6d6' },
  { value: 'BAKERY',       label: 'Bakery',       emoji: '🥐', tint: '#fde2ee' },
  { value: 'CAFE',         label: 'Café',         emoji: '☕', tint: '#efe2d4' },
]
