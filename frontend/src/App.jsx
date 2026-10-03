import { Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import MonitorStatus from './components/MonitorStatus'
import Dashboard from './pages/Dashboard'
import RamDetails from './pages/RamDetails'
import Settings from './pages/Settings'
import './App.css'
import FileBrowser from './components/FileBrowser'
import { useAuth } from './auth/AuthContext'
import Login from './pages/Login'
import RequireAdmin from './components/RequireAdmin'
import { StatsProvider } from './stats/StatsContext'

function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return <p>Checking login...</p>
  }
  if (!user) {
    return <Login />
  }
  return (
    <StatsProvider>
      <div className="app">
        <Sidebar />

        <main className="main-content">
          <MonitorStatus />
          {/* Page content swaps here based on the current route */}
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/ram" element={<RequireAdmin><RamDetails /></RequireAdmin>} />
            <Route path="/storage" element={<FileBrowser />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </StatsProvider>
  )
}

export default App
