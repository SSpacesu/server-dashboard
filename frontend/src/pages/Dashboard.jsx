import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import StatCard from '../components/StatCard'
import HistoryChart from '../components/HistoryChart'

const API_URL = `http://${window.location.hostname}:8000`

function Dashboard() {
  const [stats, setStats] = useState(null)
  const [history, setHistory] = useState([])

  useEffect(() => {
    const fetchStats = () => {
      fetch(`${API_URL}/api/stats`)
        .then(response => response.json())
        .then(data => setStats(data))
    }

    fetchStats()

    const interval = setInterval(fetchStats, 2000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const fetchHistory = () => {
      fetch(`${API_URL}/api/history`)
        .then(response => response.json())
        .then(data => setHistory(data))
    }

    fetchHistory()

    const interval = setInterval(fetchHistory, 10000)

    return () => clearInterval(interval)
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
