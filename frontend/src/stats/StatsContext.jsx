import { createContext, useContext, useEffect, useState } from 'react'

const StatsContext = createContext(null)

export function StatsProvider({ children }) {
  const [stats, setStats] = useState(null)
  const [statusUnavailable, setStatusUnavailable] = useState(false)

  useEffect(() => {
    const fetchStats = () => {
      fetch('/api/stats')
        .then(response => {
          if (!response.ok) {
            throw new Error('Unable to retrieve server stats')
          }

          return response.json()
        })
        .then(data => {
          setStats(data)
          setStatusUnavailable(false)
        })
        .catch(() => {
          setStatusUnavailable(true)
        })
    }

    fetchStats()
    const interval = setInterval(fetchStats, 2000)

    return () => clearInterval(interval)
  }, [])

  return (
    <StatsContext.Provider value={{ stats, statusUnavailable }}>
      {children}
    </StatsContext.Provider>
  )
}

export function useStats() {
  const context = useContext(StatsContext)

  if (context === null) {
    throw new Error('useStats must be used inside StatsProvider')
  }

  return context
}