import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import './Navbar.css';

export function Navbar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">
          AI Job Search
        </Link>

        {user && (
          <div className="navbar-menu">
            <Link to="/dashboard" className="navbar-link">
              Dashboard
            </Link>
            <Link to="/resumes" className="navbar-link">
              Resumes
            </Link>
            <Link to="/jobs" className="navbar-link">
              Jobs
            </Link>
            <Link to="/applications" className="navbar-link">
              Applications
            </Link>

            <div className="navbar-user">
              <span className="navbar-email">{user.email}</span>
              <button onClick={handleLogout} className="btn btn-sm btn-secondary">
                Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

