import { useEffect, useState } from 'react'
import { useStats } from '../stats/StatsContext'

function MonitorStatus() {
  const { stats, statusUnavailable } = useStats()
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const clockInterval = setInterval(() => {
      setNow(Date.now())
    }, 1000)

    return () => clearInterval(clockInterval)
  }, [])

  const lastUpdatedMs = stats?.last_updated ? Date.parse(stats.last_updated) : NaN
  const secondsSinceUpdate = Number.isFinite(lastUpdatedMs)
    ? Math.max(0, Math.floor((now - lastUpdatedMs) / 1000))
    : null
  const monitoringStatus = statusUnavailable
    ? 'unavailable'
    : secondsSinceUpdate === null
        ? 'waiting'
        : secondsSinceUpdate <= 10
          ? 'online'
          : 'stale'

  return (
    <div className={`monitor-status monitor-status--${monitoringStatus}`}>
      <span className="monitor-status-dot" aria-hidden="true" />
      <strong>
        {monitoringStatus === 'online' && 'Server Online'}
        {monitoringStatus === 'stale' && `Server data stale — ${secondsSinceUpdate} seconds ago`}
        {monitoringStatus === 'waiting' && 'Waiting for server data'}
        {monitoringStatus === 'unavailable' && 'Unable to check server'}
      </strong>
    </div>
  )
}

export default MonitorStatus