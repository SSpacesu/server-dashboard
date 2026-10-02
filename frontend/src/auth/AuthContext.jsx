import { createContext, useContext, useEffect, useState } from 'react'


const AuthContext = createContext(null)


export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/me', {
      credentials: 'include',
    })
      .then(response => {
        if (!response.ok) {
          return null
        }

        return response.json()
      })
      .then(authenticatedUser => {
        setUser(authenticatedUser)
      })
      .catch(() => {
        setUser(null)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

    const login = async (username, password) => {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
                username,
                password,
            }),
        })

        if (!response.ok) {
            const errorBody = await response.json()
            throw new Error(errorBody.detail || 'Login failed')
        }

        const authenticatedUser = await response.json()
        setUser(authenticatedUser)
    }

    const logout = async () => {
        const response = await fetch('/api/logout', {
            method: 'POST',
            credentials: 'include',
        })

        if (!response.ok) {
            throw new Error('Logout failed')
        }

        setUser(null)
    }

    
    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
        {children}
        </AuthContext.Provider>
    )
}


export function useAuth() {
  const context = useContext(AuthContext)

  if (context === null) {
    throw new Error('useAuth must be used inside AuthProvider')
  }

  return context
}