import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  // Get display name based on role
  const getDisplayName = () => {
    if (user.role === 'admin') {
      return user.name || 'Admin';
    }
    return user.name;
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        {/* Logo Section - Left Side */}
        <Link to={user.role === 'admin' ? '/admin' : '/dashboard'} className="nav-logo">
          <span className="logo-icon">🗑️</span>
          <span className="logo-text">EcoWaste Manager</span>
        </Link>
        
        {/* Navigation Links - Center/Left Section */}
        <div className="nav-links">
          {user.role === 'admin' ? (
            // Admin Menu
            <Link to="/admin" className="nav-link">
              <span className="nav-icon">👑</span>
              <span>Dashboard</span>
            </Link>
          ) : user.role === 'user' ? (
            // User Menu
            <>
              <Link to="/dashboard" className="nav-link">
                <span className="nav-icon">📊</span>
                <span>Dashboard</span>
              </Link>
              <Link to="/report" className="nav-link">
                <span className="nav-icon">📸</span>
                <span>Report Waste</span>
              </Link>
              <Link to="/reports" className="nav-link">
                <span className="nav-icon">📋</span>
                <span>My Reports</span>
              </Link>
            </>
          ) : (
            // Cleaner Menu
            <>
              <Link to="/dashboard" className="nav-link">
                <span className="nav-icon">📊</span>
                <span>Dashboard</span>
              </Link>
              <Link to="/reports" className="nav-link">
                <span className="nav-icon">🧹</span>
                <span>Clean Reports</span>
              </Link>
            </>
          )}
        </div>

        {/* Profile Section - Right Side */}
        <div className="nav-profile">
          {/* Points Badge */}
          <div className="points-badge">
            <span className="points-icon">⭐</span>
            <span className="points-value">{user.points || 0}</span>
          </div>
          
          {/* User Profile */}
          <div className="user-profile">
            <div className="user-avatar">
              {user.role === 'admin' ? '👑' : user.role === 'user' ? '👤' : '🧹'}
            </div>
            <div className="user-details">
              <span className="user-name">{getDisplayName()}</span>
              <span className="user-role">{user.role}</span>
            </div>
            <button onClick={handleLogout} className="logout-btn">
              <span className="logout-icon">🚪</span>
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;