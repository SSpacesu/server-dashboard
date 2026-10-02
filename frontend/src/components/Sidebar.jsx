import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

function Sidebar() {
  const { user, logout } = useAuth()
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (!isOpen) return undefined

    const closeOnEscape = event => {
      if (event.key === 'Escape') setIsOpen(false)
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [isOpen])

  return (
    <>
      <button
        className="sidebar-toggle"
        type="button"
        aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={isOpen}
        aria-controls="sidebar-navigation sidebar-account"
        onClick={() => setIsOpen(open => !open)}
      >
        <span className="sidebar-toggle-icon" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      </button>
      {isOpen && (
        <button
          className="sidebar-backdrop"
          type="button"
          aria-label="Close navigation menu"
          onClick={() => setIsOpen(false)}
        />
      )}
      <aside className={`sidebar${isOpen ? ' sidebar--open' : ''}`}>
      <nav id="sidebar-navigation">
        <Link to="/" onClick={() => setIsOpen(false)}>Dashboard</Link>
        
        <Link to="/storage" onClick={() => setIsOpen(false)}>Storage</Link>
        {/* History and Services pages don't exist yet */}
        <a href="#" onClick={() => setIsOpen(false)}>History</a>
        <a href="#" onClick={() => setIsOpen(false)}>Services</a>
        {user.is_admin && (
          <Link to="/ram" onClick={() => setIsOpen(false)}>Ram</Link>
        )}
        <Link to="/settings" onClick={() => setIsOpen(false)}>Settings</Link>
      </nav>
      <div className="sidebar-account" id="sidebar-account">
        <span>{user.username}</span>

        <small>
          {user.is_admin ? 'Administrator' : 'Member'}
        </small>

        <button type="button" onClick={logout}>
          Log out
        </button>
      </div>
      </aside>
    </>
  )
}

export default Sidebar