import { Link } from 'react-router-dom'

function Sidebar() {
  return (
    <aside className="sidebar">
      <nav>
        <Link to="/">Dashboard</Link>
        <a href="#">History</a>
        <a href="#">Services</a>
        <Link to="/settings">Settings</Link>
      </nav>
    </aside>
  )
}

export default Sidebar