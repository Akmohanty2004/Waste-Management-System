import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Auth.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [errorMsg, setErrorMsg] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    
    const result = await login(email, password, role);
    
    if (result.success) {
      const user = JSON.parse(localStorage.getItem('user'));
      if (user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } else {
      setErrorMsg(result.message);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-overlay"></div>

      {/* Animated transparent glowing circles */}
      <div className="bg-glow glow-1"></div>
      <div className="bg-glow glow-2"></div>
      <div className="bg-glow glow-3"></div>
      <div className="bg-glow glow-4"></div>

      <div className="auth-wrapper login-layout">
        {/* LEFT SIDE FORM */}
        <div className="auth-card split-card left-panel">
          <div className="auth-logo">
            <span className="logo-icon">♻️</span>
            <h2>CLEAN INDIA</h2>
          </div>

          <h3>Welcome Back!</h3>
          <p className="subtitle">Sign in to manage your account.</p>
          
          {errorMsg && <div className="error-message">{errorMsg}</div>}
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <div className="input-icon">
                <span className="icon">👤</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email Address"
                  required
                />
              </div>
            </div>
            
            <div className="form-group">
              <div className="input-icon">
                <span className="icon">🔒</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  required
                />
                <span className="right-icon">👁️</span>
              </div>
            </div>

            <div className="remember-row">
              <label className="remember-box">
                <input type="checkbox" />
                <span>Remember Me</span>
              </label>
              <a href="#!" className="forgot-link">Forgot Password?</a>
            </div>
            
            <div className="form-group">
              <label className="login-as-label">Login As</label>
              <div className="role-selector">
                <button 
                  type="button"
                  className={`role-btn ${role === 'user' ? 'active' : ''}`}
                  onClick={() => setRole('user')}
                >
                  <span>👥</span>
                  <span>User</span>
                  <small>Report Waste</small>
                </button>

                <button 
                  type="button"
                  className={`role-btn ${role === 'cleaner' ? 'active' : ''}`}
                  onClick={() => setRole('cleaner')}
                >
                  <span>🧹</span>
                  <span>Cleaner</span>
                  <small>Clean Waste</small>
                </button>

                <button 
                  type="button"
                  className={`role-btn admin ${role === 'admin' ? 'active' : ''}`}
                  onClick={() => setRole('admin')}
                >
                  <span>👑</span>
                  <span>Admin</span>
                  <small>Management</small>
                </button>
              </div>
            </div>
            
            <button type="submit" className="btn-primary">
              Sign In
            </button>
          </form>

          

          
          
          <p className="auth-link">
            Don&apos;t have an account? <Link to="/register">Sign Up</Link>
          </p>
        </div>

        {/* RIGHT SIDE DESIGN PANEL */}
        <div className="illustration-panel">
          <div className="panel-light"></div>
          <div className="floating-logo">🪴</div>
          <h2>EcoCycle</h2>
          <div className="truck-illustration">🚛♻️🗑️</div>
          <h3>Efficiently Managing Waste for a Greener Tomorrow</h3>
          <p>Optimize Your Waste Collection</p>
        </div>
      </div>
    </div>
  );
};

export default Login;