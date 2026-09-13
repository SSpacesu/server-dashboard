import { Link } from 'react-router-dom'

function Sidebar() {
  return (
    <aside className="sidebar">
      <nav>
        <Link to="/">Dashboard</Link>
        <Link to="/storage">Storage</Link>
        {/* History and Services pages don't exist yet */}
        <a href="#">History</a>
        <a href="#">Services</a>
        <Link to="/settings">Settings</Link>
      </nav>
    </aside>
  )
}

export default Sidebar