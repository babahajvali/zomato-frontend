import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function ProfileMenu() {
  const { session, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDocClick = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    const onEsc = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onEsc)
    }
  }, [open])

  if (!session) return null

  const isOwner = session.role === 'OWNER'
  const displayName = session.name || session.email || 'User'
  const initial = (displayName.trim()[0] || 'U').toUpperCase()

  const go = (path) => {
    setOpen(false)
    navigate(path)
  }

  const handleLogout = () => {
    setOpen(false)
    logout()
    navigate('/login')
  }

  return (
    <div className="profile-menu" ref={rootRef}>
      <button
        type="button"
        className="profile-avatar-btn"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="profile-avatar">{initial}</span>
        {/*<span className={'profile-caret' + (open ? ' open' : '')} aria-hidden="true">▾</span>*/}
      </button>

      {open && (
        <div className="profile-dropdown" role="menu">
          <div className="profile-dropdown-header">
            <span className="profile-avatar profile-avatar-lg">{initial}</span>
            <div className="profile-dropdown-userinfo">
              <div className="profile-dropdown-name">{displayName}</div>
              {session.email && (
                <div className="profile-dropdown-email">{session.email}</div>
              )}
            </div>
          </div>

          {!isOwner && (
            <>
              <div className="profile-dropdown-divider" />
              <button className="profile-dropdown-item" role="menuitem" onClick={() => go('/profile')}>
                <span className="profile-dropdown-icon" aria-hidden="true">👤</span>
                Profile
              </button>
              <button className="profile-dropdown-item" role="menuitem" onClick={() => go('/orders')}>
                <span className="profile-dropdown-icon" aria-hidden="true">📦</span>
                Orders
              </button>
              <button className="profile-dropdown-item" role="menuitem" onClick={() => go('/addresses')}>
                <span className="profile-dropdown-icon" aria-hidden="true">📍</span>
                Addresses
              </button>
            </>
          )}

          <div className="profile-dropdown-divider" />
          <button
            className="profile-dropdown-item profile-dropdown-logout"
            role="menuitem"
            onClick={handleLogout}
          >
            <span className="profile-dropdown-icon" aria-hidden="true">🚪</span>
            Logout
          </button>
        </div>
      )}
    </div>
  )
}
