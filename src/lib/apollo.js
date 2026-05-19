import { ApolloClient, InMemoryCache, HttpLink, from } from '@apollo/client'
import { setContext } from '@apollo/client/link/context'
import { onError } from '@apollo/client/link/error'
import { getToken } from './session.js'

const httpLink = new HttpLink({
  uri: 'http://13.127.77.139/graphql/',
  credentials: 'include',
})

const authLink = setContext((_, { headers }) => {
  const token = getToken()
  return {
    headers: {
      ...(headers || {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  }
})

function handleSessionExpired() {
  localStorage.clear()
  sessionStorage.clear()
  if (window.location.pathname !== '/login') {
    window.location.href = '/login?session=expired'
  }
}

const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors) {
    for (const err of graphQLErrors) {
      const msg = (err.message || '').toLowerCase()
      if (
        msg.includes('token') ||
        msg.includes('expired') ||
        msg.includes('unauthorized') ||
        err.extensions?.code === 'UNAUTHENTICATED'
      ) {
        handleSessionExpired()
        return
      }
    }
  }

  if (networkError?.statusCode === 401) {
    handleSessionExpired()
  }
})

export const client = new ApolloClient({
  link: from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: { fetchPolicy: 'cache-first' },
    query: { fetchPolicy: 'cache-first' },
  },
})
