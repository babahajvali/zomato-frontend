import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function ProtectedRoute({ children }) {
  const { session } = useAuth()
  const loc = useLocation()
  if (!session?.token || !session?.userId) {
    return <Navigate to="/login" replace state={{ from: loc.pathname }} />
  }
  return children
}
