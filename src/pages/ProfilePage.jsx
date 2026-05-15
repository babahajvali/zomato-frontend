import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@apollo/client'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/Toast.jsx'
import { UPDATE_USER } from '../graphql/operations.js'

const PencilIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
  </svg>
)

function ProfileField({
  label,
  value,
  editable = true,
  onSave,
  validate,
  transformInput,
  type = 'text',
  inputMode,
  placeholder,
  autoComplete,
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!editing) setDraft(value || '')
  }, [value, editing])

  const startEdit = () => {
    setDraft(value || '')
    setError('')
    setEditing(true)
  }

  const cancel = () => {
    setDraft(value || '')
    setError('')
    setEditing(false)
  }

  const save = async () => {
    const trimmed = (draft || '').trim()
    if (validate) {
      const msg = validate(trimmed)
      if (msg) {
        setError(msg)
        return
      }
    }
    if (trimmed === (value || '').trim()) {
      setEditing(false)
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSave(trimmed)
      setEditing(false)
    } catch (err) {
      setError(err?.message || 'Update failed. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (raw) => {
    setDraft(transformInput ? transformInput(raw) : raw)
  }

  return (
    <div className={'profile-field' + (editing ? ' editing' : '')}>
      <div className="profile-field-label">{label}</div>

      {!editing ? (
        <div className="profile-field-view">
          <span
            className={
              'profile-field-value' + (value ? '' : ' is-empty')
            }
          >
            {value || 'Not provided'}
          </span>
          {editable && (
            <button
              type="button"
              className="profile-field-edit-btn"
              onClick={startEdit}
              aria-label={`Edit ${label}`}
              title={`Edit ${label}`}
            >
              <PencilIcon />
            </button>
          )}
        </div>
      ) : (
        <div className="profile-field-edit">
          <input
            className="input"
            type={type}
            inputMode={inputMode}
            placeholder={placeholder}
            autoComplete={autoComplete}
            value={draft}
            onChange={(e) => handleChange(e.target.value)}
            disabled={saving}
            autoFocus
          />
          {error && (
            <div className="profile-field-error" role="alert">
              {error}
            </div>
          )}
          <div className="profile-field-actions">
            <button
              type="button"
              className="btn subtle sm"
              onClick={cancel}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn sm"
              onClick={save}
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ProfilePage() {
  const { session, login, logout } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [updateUserMutation] = useMutation(UPDATE_USER)

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  const displayName = session?.name || 'User'
  const email = session?.email || ''
  const phone = session?.phone || ''
  const initial = (displayName.trim()[0] || 'U').toUpperCase()

  const updateField = async (params) => {
    const { data } = await updateUserMutation({
      variables: {
        params: { userId: session.userId, ...params },
      },
    })
    const res = data.updateUser
    const tn = res.__typename

    if (tn === 'UserType') {
      login({
        ...session,
        name: res.name,
        email: res.email,
        phone: res.phoneNumber,
      })
      toast.success('Profile updated successfully')
      return
    }

    if (tn === 'EmptyUserNameFound') throw new Error('Full name cannot be empty.')
    if (tn === 'UserNotFound') throw new Error('User not found. Please log in again.')
    if (tn === 'NothingToUpdateUserProperties') {
      toast.info('No changes to save')
      return
    }
    if (tn === 'UnauthorizedFound') throw new Error('Session expired. Please log in again.')
    throw new Error('Update failed. Please try again.')
  }

  const handleSaveName = async (newName) => {
    try {
      await updateField({ name: newName })
    } catch (err) {
      toast.error(err.message)
      throw err
    }
  }

  const handleSavePhone = async (newPhone) => {
    try {
      await updateField({ phoneNumber: newPhone })
    } catch (err) {
      toast.error(err.message)
      throw err
    }
  }

  const validateName = (val) => {
    if (!val || val.trim().length < 2) return 'Full name must be at least 2 characters.'
    return ''
  }

  const validatePhone = (val) => {
    if (!val) return 'Phone number is required.'
    if (!/^\d{10}$/.test(val)) return 'Phone must be exactly 10 digits.'
    return ''
  }

  const handleLogout = () => {
    setShowLogoutConfirm(false)
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="profile-page">
      <div className="profile-card">
        {/* Header */}
        <div className="profile-header">
          <div className="profile-avatar">
            <span className="profile-avatar-text">{initial}</span>
          </div>
          <h2 className="profile-name">{displayName}</h2>
          <p className="profile-email">{email || 'No email on file'}</p>
        </div>

        {/* Editable fields */}
        <div className="profile-fields">
          <ProfileField
            label="Full Name"
            value={session?.name || ''}
            onSave={handleSaveName}
            validate={validateName}
            autoComplete="name"
            placeholder="Your full name"
          />
          <ProfileField
            label="Email"
            value={email}
            editable={false}
          />
          <ProfileField
            label="Phone Number"
            value={phone}
            onSave={handleSavePhone}
            validate={validatePhone}
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            placeholder="10-digit mobile number"
            transformInput={(raw) => raw.replace(/\D/g, '').slice(0, 10)}
          />
        </div>

        {/* Logout */}
        <button
          type="button"
          className="logout-btn"
          onClick={() => setShowLogoutConfirm(true)}
        >
          Logout
        </button>
      </div>

      {/* Logout confirmation modal */}
      {showLogoutConfirm && (
        <div
          className="modal-backdrop"
          onClick={() => setShowLogoutConfirm(false)}
        >
          <div
            className="modal-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="logout-modal-title" className="modal-title">
              Log out of Zomato?
            </h3>
            <p className="modal-msg">
              You'll need to sign in again to place orders or view your cart.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="btn subtle"
                onClick={() => setShowLogoutConfirm(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn danger"
                onClick={handleLogout}
              >
                Yes, log out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
