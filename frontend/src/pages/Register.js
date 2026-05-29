import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Auth.css';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'user',
    phoneNumber: '',
    address: ''
  });
  const [errorMsg, setErrorMsg] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    
    if (formData.password !== formData.confirmPassword) {
      setErrorMsg('Passwords do not match');
      return;
    }
    
    if (formData.password.length < 6) {
      setErrorMsg('Password must be at least 6 characters');
      return;
    }
    
    const result = await register(
      formData.name,
      formData.email,
      formData.password,
      formData.role,
      formData.phoneNumber,
      formData.address
    );
    
    if (result.success) {
      navigate('/dashboard');
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

      <div className="auth-wrapper register-layout">
        {/* LEFT FORM */}
        <div className="auth-card split-card left-panel register-card">
          <div className="auth-logo">
            <span className="logo-icon">♻️</span>
            <h2>CLEAN INDIA</h2>
          </div>

          <h3>Create Account</h3>
          <p className="subtitle">Join us in making our city clean!</p>
          
          {errorMsg && <div className="error-message">{errorMsg}</div>}
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <div className="input-icon">
                <span className="icon">👤</span>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Full Name"
                  required
                />
              </div>
            </div>
            
            <div className="form-group">
              <div className="input-icon">
                <span className="icon">📧</span>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Email Address"
                  required
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <div className="input-icon">
                  <span className="icon">🔒</span>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Password"
                    required
                  />
                </div>
              </div>
              
              <div className="form-group">
                <div className="input-icon">
                  <span className="icon">✔️</span>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Confirm Password"
                    required
                  />
                </div>
              </div>
            </div>
            
            <div className="form-group">
              <label className="login-as-label">I want to</label>
              <div className="role-selector large">
                <button 
                  type="button"
                  className={`role-btn ${formData.role === 'user' ? 'active' : ''}`}
                  onClick={() => setFormData({...formData, role: 'user'})}
                >
                  <span>📸</span>
                  <span>Report Waste Areas</span>
                  <small>Earn points and help keep city clean</small>
                </button>

                <button 
                  type="button"
                  className={`role-btn ${formData.role === 'cleaner' ? 'active' : ''}`}
                  onClick={() => setFormData({...formData, role: 'cleaner'})}
                >
                  <span>🧹</span>
                  <span>Clean Waste Areas</span>
                  <small>Earn money while cleaning</small>
                </button>
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <div className="input-icon">
                  <span className="icon">📱</span>
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    placeholder="Phone Number"
                  />
                </div>
              </div>
              
              <div className="form-group">
                <div className="input-icon">
                  <span className="icon">🏠</span>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Address"
                  />
                </div>
              </div>
            </div>
            
            <button type="submit" className="btn-primary">
              Register Now
            </button>
          </form>
          
          <p className="auth-link">
            Already have an account? <Link to="/login">Login Here</Link>
          </p>
        </div>

        {/* RIGHT DESIGN */}
        <div className="illustration-panel register-illustration">
          <div className="panel-light"></div>
          <div className="floating-logo">🪴🧹</div>
          <h2>EcoCycle</h2>
          <div className="truck-illustration">🚛♻️🗑️</div>
          <h3>Join The Green Mission Today</h3>
          <p>Be a part of the cleaner future</p>
        </div>
      </div>
    </div>
  );
};

export default Register;