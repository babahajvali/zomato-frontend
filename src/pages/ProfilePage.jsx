import { useAuth } from '../context/AuthContext.jsx'
import { useNavigate } from 'react-router-dom'

export default function ProfilePage() {
  const { session, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // Get user data from session/localStorage
  const getUserData = () => {
    try {
      const sessionData = localStorage.getItem('zomato_session')
      if (sessionData) {
        const parsed = JSON.parse(sessionData)
        return {
          name: parsed.name || 'User',
          email: parsed.email || 'Not available',
          phone: parsed.phone || 'Not available'
        }
      }
    } catch (error) {
      console.error('Error parsing session data:', error)
    }
    
    // Fallback to session context
    return {
      name: session?.name || 'User',
      email: session?.email || 'Not available', 
      phone: session?.phone || 'Not available'
    }
  }

  const userData = getUserData()
  const getInitial = (name) => {
    return name ? name.charAt(0).toUpperCase() : 'U'
  }

  return (
    <div className="profile-page">
      <div className="profile-card">
        {/* User Avatar */}
        <div className="profile-avatar">
          <span className="profile-avatar-text">
            {getInitial(userData.name)}
          </span>
        </div>
        
        {/* User Information */}
        <div className="profile-info">
          <h2 className="profile-name">
            {userData.name}
          </h2>
          
          <div className="profile-detail">
            <span className="profile-label">Email</span>
            <span className="profile-value">{userData.email}</span>
          </div>
          
          <div className="profile-detail">
            <span className="profile-label">Phone</span>
            <span className="profile-value">{userData.phone}</span>
          </div>
        </div>
        
        {/* Logout Button */}
        <button 
          className="btn logout-btn" 
          onClick={handleLogout}
        >
          Logout
        </button>
      </div>
    </div>
  )
}
