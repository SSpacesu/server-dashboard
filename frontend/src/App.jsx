import { Routes, Route } from 'react-router-dom'

import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import RamDetails from './pages/RamDetails'
import Settings from './pages/Settings'
import './App.css'
import FileBrowser from './components/FileBrowser'

function App() {
  return (
    <div className="app">
      <Sidebar />

      <main className="main-content">
        {/* Page content swaps here based on the current route */}
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/ram" element={<RamDetails />} />
          <Route path="/storage" element={<FileBrowser />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
