import { ApolloClient, InMemoryCache, HttpLink, from } from '@apollo/client'
import { setContext } from '@apollo/client/link/context'
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

export const client = new ApolloClient({
  link: from([authLink, httpLink]),
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: { fetchPolicy: 'cache-first' },
    query: { fetchPolicy: 'cache-first' },
  },
})
