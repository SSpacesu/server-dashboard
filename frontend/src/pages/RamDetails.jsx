import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

const API_URL = `http://${window.location.hostname}:8000`

function formatMB(bytes) {
  return bytes != null ? `${(bytes / (1024 * 1024)).toFixed(0)} MB` : 'N/A'
}

function RamDetails() {
  const [stats, setStats] = useState(null)
  const [processes, setProcesses] = useState([])
  const [sortKey, setSortKey] = useState('ram_percent')

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
    const fetchProcesses = () => {
      fetch(`${API_URL}/api/processes`)
        .then(response => response.json())
        .then(data => setProcesses(data))
    }

    fetchProcesses()

    const interval = setInterval(fetchProcesses, 3000)

    return () => clearInterval(interval)
  }, [])

  const sortedProcesses = [...processes].sort((a, b) => {
    const valueA = a[sortKey]
    const valueB = b[sortKey]
    if (typeof valueA === 'number' && typeof valueB === 'number') {
      return valueB - valueA
    }
    return String(valueA ?? '').localeCompare(String(valueB ?? ''))
  })

  return (
    <>
      <h1>RAM Usage</h1>
      <p className="ram-details-back">
        <Link to="/">&larr; Back to Dashboard</Link>
      </p>

      <div className="panel">
        <h2>Memory Overview</h2>
        {stats ? (
          <div className="stat-row">
            <div className="stat-card">
              <span className="stat-card-label">RAM Usage</span>
              <span className="stat-card-value">
                {stats.ram_percent}
                <span className="stat-card-unit">%</span>
              </span>
              {stats.ram_used != null && stats.ram_size != null && (
                <span className="stat-card-subvalue">
                  {formatMB(stats.ram_used)} of {formatMB(stats.ram_size)}
                </span>
              )}
            </div>
          </div>
        ) : (
          <p>Loading...</p>
        )}
      </div>

      <div className="panel">
        <h2>Running Processes</h2>
        <table className="process-table">
          <thead>
            <tr>
              <th onClick={() => setSortKey('pid')} className="process-table-sortable">PID</th>
              <th onClick={() => setSortKey('name')} className="process-table-sortable">Name</th>
              <th onClick={() => setSortKey('username')} className="process-table-sortable">User</th>
              <th onClick={() => setSortKey('cpu_percent')} className="process-table-sortable">CPU %</th>
              <th onClick={() => setSortKey('ram_percent')} className="process-table-sortable">RAM %</th>
              <th onClick={() => setSortKey('status')} className="process-table-sortable">Status</th>
              <th>Command</th>
            </tr>
          </thead>
          <tbody>
            {sortedProcesses.map(proc => (
              <tr key={proc.pid}>
                <td>{proc.pid}</td>
                <td>{proc.name}</td>
                <td>{proc.username}</td>
                <td>{proc.cpu_percent != null ? proc.cpu_percent.toFixed(1) : 'N/A'}</td>
                <td>{proc.ram_percent != null ? proc.ram_percent.toFixed(1) : 'N/A'}</td>
                <td>{proc.status}</td>
                <td className="process-table-cmdline">{proc.cmdline}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

export default RamDetails
