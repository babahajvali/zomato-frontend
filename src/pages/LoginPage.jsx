import { useState, useEffect } from 'react'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useApolloClient, useMutation } from '@apollo/client'
import { GET_USER_ADDRESSES, USER_LOGIN, GET_CUSTOMER_CART_ID } from '../graphql/operations.js'

export default function LoginPage() {
  const { login, session } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const client = useApolloClient()
  const [searchParams] = useSearchParams()
  const sessionExpired = searchParams.get('session') === 'expired'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const [userLogin, { loading: loginLoading }] = useMutation(USER_LOGIN)

  useEffect(() => {
    if (session?.token) {
      navigate(session.role === 'OWNER' ? '/owner' : '/', { replace: true })
    }
  }, [session, navigate])


  const submit = async (e) => {
    e?.preventDefault?.()
    setError('')
    
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.')
      return
    }
    
    setBusy(true)
    try {
      const { data } = await userLogin({
        variables: {
          params: {
            email: email.trim(),
            password: password.trim()
          }
        }
      })

      const response = data.userLogin
      const typename = response.__typename

      if (typename === 'UserLoginType') {
        // Login successful - create session without cart ID
        const sess = {
          userId: response.userId,
          token: response.accessToken,
          name: response.name,
          email: response.email,
          phoneNumber: response.phoneNumber,
          role: response.role,
          cartId: null // Cart will be fetched dynamically when needed
        }
        
        login(sess)
        
        // Verify the session works by making an authenticated query
        const result = await client.query({
          query: GET_USER_ADDRESSES,
          fetchPolicy: 'network-only',
          context: { headers: { authorization: `Bearer ${sess.token}` } },
        })
        
        const tn = result?.data?.getUserAddresses?.__typename
        if (tn === 'UserNotFound') {
          setError('Login successful, but user not found in DB.')
          setBusy(false)
          return
        }

        // Redirect based on role
        if (sess.role === 'OWNER') {
          navigate('/owner', { replace: true })
        } else {
          const fromState = location.state?.from
          const fallback = fromState && fromState !== '/login' ? fromState : '/'
          navigate(fallback, { replace: true })
        }
      } else if (typename === 'EmailNotFound') {
        setError(`No account found with email: ${response.email}`)
      } else if (typename === 'InvalidCredentials') {
        setError('Incorrect password. Please try again.')
      } else {
        setError('Login failed: Unknown error occurred.')
      }
    } catch (err) {
      setError('Login failed: ' + (err?.message || 'Network error. Please check your connection.'))
    } finally {
      setBusy(false)
    }
  }


  return (
    <div className="login-shell">
      <div className="login-card">
        <h1 className="login-title">
          <span className="brand-dot">Z</span> Zomato login
        </h1>
        <p className="login-sub">
          Enter your email and password to login to your Zomato account.
        </p>

        {sessionExpired && (
          <div className="error-message">
            Your session has expired. Please log in again.
          </div>
        )}

        {error && <div className="errbox">{error}</div>}

        <form onSubmit={submit}>
          <div className="field">
            <label>Email</label>
            <input
              className="input"
              type="email"
              placeholder="john@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy || loginLoading}
            />
          </div>
          <div className="field">
            <label>Password</label>
            <input
              className="input"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy || loginLoading}
            />
          </div>
          <button className="btn block" type="submit" disabled={busy || loginLoading}>
            {busy || loginLoading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="login-sub" style={{ marginTop: 18, textAlign: 'center' }}>
          New to Zomato?{' '}
          <button
            type="button"
            onClick={() => navigate('/signup')}
            style={{
              background: 'none',
              border: 'none',
              color: '#F97316',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: 'inherit',
              padding: 0,
            }}
          >
            Create an account
          </button>
        </p>

      </div>
    </div>
  )
}
