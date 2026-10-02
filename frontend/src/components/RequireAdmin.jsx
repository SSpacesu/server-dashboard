import { Navigate } from 'react-router-dom'

import { useAuth } from '../auth/AuthContext'


function RequireAdmin({ children }) {
  const { user } = useAuth()

  if (!user.is_admin) {
    return <Navigate to="/" replace />
  }

  return children
}

export default RequireAdmin