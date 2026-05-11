import { client } from './apollo.js'
import { GET_CUSTOMER_CART_ID } from '../graphql/operations.js'
import { getSession, setSession } from './session.js'

/**
 * Get customer cart ID dynamically
 * This function fetches the cart ID when needed, not during login
 */
export async function getCustomerCartId() {
  try {
    const result = await client.query({
      query: GET_CUSTOMER_CART_ID,
      fetchPolicy: 'network-only',
    })
    
    const response = result?.data?.getCustomerCartId
    if (response?.__typename === 'CustomerCartIdType') {
      return response.cartId
    }
    return null
  } catch (error) {
    console.warn('Failed to get cart ID:', error)
    return null
  }
}

/**
 * Get cart ID from session or fetch if not available
 */
export async function ensureCartId() {
  // Try to get from session first
  let session = getSession()
  if (session?.cartId) {
    console.log('Cart ID found in session:', session.cartId)
    return session.cartId
  }
  
  console.log('No cart ID in session, fetching from API...')
  // If not in session, fetch from API
  const cartId = await getCustomerCartId()
  console.log('Fetched cart ID:', cartId)
  
  if (cartId) {
    // Create or update session with cart ID
    if (session) {
      session.cartId = cartId
    } else {
      session = { cartId }
    }
    console.log('Updating session with cart ID:', session)
    setSession(session)
    
    // Verify it was stored
    const verifySession = getSession()
    console.log('Verification - cart ID in session:', verifySession?.cartId)
  }
  
  return cartId
}

export function debugCartStorage() {
  const session = getSession()
  console.log('Current session:', session)
  console.log('Cart ID in localStorage:', session?.cartId)
  return session?.cartId
}
