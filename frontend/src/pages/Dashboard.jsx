import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import StatCard from '../components/StatCard'
import HistoryChart from '../components/HistoryChart'

// Backend runs on the same host as the frontend, just on a different port
const API_URL = `http://${window.location.hostname}:8000`

const formatBytes = bytes => {
  if (bytes == null) return 'Unavailable'
  if (bytes < 1024) return `${bytes.toFixed(0)} B`
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  if (bytes < 1024 ** 4) return `${(bytes / 1024 ** 3).toFixed(2)} GB`
  return `${(bytes / 1024 ** 4).toFixed(2)} TB`
}

const formatRate = bytesPerSecond => `${formatBytes(bytesPerSecond)}/s`

function Dashboard() {
  const [stats, setStats] = useState(null)
  const [history, setHistory] = useState([])

  // Poll the latest snapshot every 2s for the live stat cards
  useEffect(() => {
    const fetchStats = () => {
      fetch(`/api/stats`)
        .then(response => response.json())
        .then(data => setStats(data))
    }

    fetchStats()

    const interval = setInterval(fetchStats, 2000)

    return () => clearInterval(interval)
  }, [])

  // History updates less often since the backend only persists a sample every 15s
  useEffect(() => {
    let timeoutId

    const fetchHistory = () => {
      fetch(`/api/history`)
        .then(response => response.json())
        .then(data => setHistory(data))
    }

    // Align fetches to wall-clock :00/:15/:30/:45 so they land right after the backend saves
    const scheduleNextFetch = () => {
      const msUntilNextBoundary = 15000 - (Date.now() % 15000)
      timeoutId = setTimeout(() => {
        fetchHistory()
        scheduleNextFetch()
      }, msUntilNextBoundary)
    }

    fetchHistory()
    scheduleNextFetch()

    return () => clearTimeout(timeoutId)
  }, [])

  if (!stats) {
    return <p>Loading...</p>
  }

  return (
    <>
      <h1>Server Dashboard</h1>
      <div className="panel">
        <h2>Usage Stats</h2>
        <div className="stat-row">
          <StatCard
            label="CPU Usage"
            value={stats.cpu_percent}
            unit="%"
            warningAt={70}
            dangerAt={90}
            subValue={stats.cpu_temp != null ? `${stats.cpu_temp.toFixed(1)}°C` : null}
          />
          <Link to="/ram" className="stat-card-link">
            <StatCard label="RAM Usage" value={stats.ram_percent} unit="%" warningAt={70} dangerAt={90} subValue={stats.ram_used != null && stats.ram_size != null ? `${(stats.ram_used / (1024 * 1024)).toFixed(0)} MB of ${(stats.ram_size / (1024 * 1024)).toFixed(0)} MB` : null} />
          </Link>
          <StatCard label="Disk Usage" value={stats.disk_percent} unit="%" warningAt={70} dangerAt={90} subValue={stats.disk_used != null && stats.disk_size != null ? `${(stats.disk_used / (1024 * 1024 * 1024)).toFixed(2)} GB of ${(stats.disk_size / (1024 * 1024 * 1024)).toFixed(2)} GB` : null} />
          <StatCard label="Network Download" value={formatRate(stats.network_receive_rate)} subValue={stats.network_bytes_received != null ? `${formatBytes(stats.network_bytes_received)} received` : null} />
          <StatCard label="Network Upload" value={formatRate(stats.network_send_rate)} subValue={stats.network_bytes_sent != null ? `${formatBytes(stats.network_bytes_sent)} sent` : null} />
          <StatCard label="Uptime" value={stats.uptime} />
          <StatCard label="Battery" value={stats.battery_percent != null ? `${stats.battery_percent.toFixed(1)}%` : 'Unavailable'} subValue={stats.battery_charging != null ? (stats.battery_charging ? 'Charging' : 'Not Charging') : null} />
        </div>
      </div>

      <div className="panel">
        <h2>CPU &amp; RAM History</h2>
        <HistoryChart history={history} />
      </div>
    </>
  )
}

export default Dashboard
