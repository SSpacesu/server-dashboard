import { useEffect, useState } from 'react'

import Sidebar from './components/Sidebar'
import StatCard from './components/StatCard'
import HistoryChart from './components/HistoryChart'
import './App.css'

function App() {
  const [stats, setStats] = useState(null)
  const [history, setHistory] = useState([])
  const API_URL = `http://${window.location.hostname}:8000`
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
    <div className="app">
      <Sidebar />

      <main className="main-content">
        <h1>Server Dashboard</h1>
        <div className="panel">
          <h2>Usage Stats</h2>
          <div className="stat-row">
            <StatCard label="CPU Usage" value={stats.cpu_percent} unit="%" warningAt={70} dangerAt={90} />
            <StatCard label="RAM Usage" value={stats.ram_percent} unit="%" warningAt={70} dangerAt={90} />
            <StatCard label="Disk Usage" value={stats.disk_percent} unit="%" warningAt={70} dangerAt={90} />
            <StatCard label="Uptime" value={stats.uptime} />
            <StatCard label="Battery" value={stats.battery_percent != null  ? `${stats.battery_percent.toFixed(2)}%` : 'Unavailable'}/>
          </div>
        </div>

        <div className="panel">
          <h2>CPU &amp; RAM History</h2>
          <HistoryChart history={history} />
        </div>
      </main>
    </div>
  )
}

export default App
