import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@apollo/client'
import { CREATE_USER, USER_LOGIN } from '../graphql/operations.js'
import { useAuth } from '../context/AuthContext.jsx'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function SignupPage() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [createUser] = useMutation(CREATE_USER)
  const [userLogin] = useMutation(USER_LOGIN)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState('customer')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const handlePhone = (raw) => {
    setPhone(raw.replace(/\D/g, '').slice(0, 10))
  }

  const validate = () => {
    if (!name.trim() || name.trim().length < 2) return 'Please enter your full name (min 2 characters).'
    if (!EMAIL_RE.test(email.trim())) return 'Please enter a valid email address.'
    if (!/^\d{10}$/.test(phone)) return 'Phone number must be exactly 10 digits.'
    if (password.length < 8) return 'Password must be at least 8 characters.'
    if (!/[A-Z]/.test(password)) return 'Password must contain at least 1 uppercase letter.'
    if (!/[0-9]/.test(password)) return 'Password must contain at least 1 number.'
    if (password !== confirm) return 'Passwords do not match.'
    return ''
  }

  const submit = async (e) => {
    e?.preventDefault?.()
    setError('')
    const msg = validate()
    if (msg) { setError(msg); return }

    setBusy(true)
    try {
      const { data } = await createUser({
        variables: {
          params: {
            name: name.trim(),
            email: email.trim(),
            phoneNumber: phone,
            role: role === 'owner' ? 'OWNER' : 'CUSTOMER',
            password,
          },
        },
      })
      const res = data.createUser

      if (res.__typename === 'EmailAlreadyExists') {
        setError(`An account already exists for: ${res.emails.join(', ')}`)
        return
      }
      if (res.__typename === 'EmptyUserNameFound') {
        setError('Full name cannot be empty.')
        return
      }
      if (res.__typename !== 'UserType') {
        setError('Sign up failed. Please try again.')
        return
      }

      // Auto-login on success
      const { data: loginData } = await userLogin({
        variables: { params: { email: email.trim(), password } },
      })
      const loginRes = loginData.userLogin

      if (loginRes.__typename === 'UserLoginType') {
        login({
          userId: loginRes.userId,
          token: loginRes.accessToken,
          name: loginRes.name,
          email: loginRes.email,
          phone: loginRes.phoneNumber,
          role: loginRes.role,
          cartId: null,
        })
        navigate(loginRes.role === 'OWNER' ? '/owner' : '/', { replace: true })
        return
      }
      navigate('/login', { replace: true })
    } catch (err) {
      setError('Sign up failed: ' + (err?.message || 'Network error. Please check your connection.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-shell">
      <div className="login-card">
        <h1 className="login-title">
          <span className="brand-dot">Z</span> Zomato signup
        </h1>
        <p className="login-sub">
          Create your Zomato account in a minute.
        </p>

        {error && <div className="errbox">{error}</div>}

        <form onSubmit={submit}>
          <div className="field">
            <label>Full Name</label>
            <input
              className="input"
              type="text"
              placeholder="Jane Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={busy}
              autoComplete="name"
            />
          </div>

          <div className="field">
            <label>Email</label>
            <input
              className="input"
              type="email"
              placeholder="jane@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
              autoComplete="email"
            />
          </div>

          <div className="field">
            <label>Phone Number</label>
            <input
              className="input"
              type="tel"
              inputMode="numeric"
              placeholder="10-digit mobile number"
              value={phone}
              onChange={(e) => handlePhone(e.target.value)}
              disabled={busy}
              autoComplete="tel"
            />
          </div>

          <div className="field">
            <label>I am a</label>
            <div className="role-segmented" role="radiogroup" aria-label="Role">
              <button
                type="button"
                role="radio"
                aria-checked={role === 'customer'}
                className={'role-segment' + (role === 'customer' ? ' active' : '')}
                onClick={() => setRole('customer')}
                disabled={busy}
              >
                Customer
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={role === 'owner'}
                className={'role-segment' + (role === 'owner' ? ' active' : '')}
                onClick={() => setRole('owner')}
                disabled={busy}
              >
                Restaurant Owner
              </button>
            </div>
          </div>

          <div className="field">
            <label>Password</label>
            <div className="pwd-wrap">
              <input
                className="input"
                type={showPwd ? 'text' : 'password'}
                placeholder="Min 8 chars, 1 uppercase, 1 number"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={busy}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="pwd-toggle"
                onClick={() => setShowPwd((s) => !s)}
                tabIndex={-1}
              >
                {showPwd ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <div className="field">
            <label>Confirm Password</label>
            <div className="pwd-wrap">
              <input
                className="input"
                type={showConfirm ? 'text' : 'password'}
                placeholder="Re-enter password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                disabled={busy}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="pwd-toggle"
                onClick={() => setShowConfirm((s) => !s)}
                tabIndex={-1}
              >
                {showConfirm ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <button className="btn block" type="submit" disabled={busy}>
            {busy ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p className="login-sub" style={{ marginTop: 18, textAlign: 'center' }}>
          Already have an account?{' '}
          <button
            type="button"
            onClick={() => navigate('/login')}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--brand)',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: 'inherit',
              padding: 0,
            }}
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  )
}
