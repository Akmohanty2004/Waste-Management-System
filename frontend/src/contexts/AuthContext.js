import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Auto-detect backend port
  const getBackendUrl = () => {
    // Try default port 5000 first, if fails try 5001
    return 'http://localhost:5000/api';
  };

  // Set axios default config
  axios.defaults.baseURL = getBackendUrl();
  axios.defaults.timeout = 10000;

  // Test connection and fallback to alternative port if needed
  const testConnection = async () => {
    try {
      await axios.get('/');
      console.log('✅ Connected to backend on port 5000');
      return true;
    } catch (error) {
      console.log('⚠️ Port 5000 failed, trying 5001...');
      axios.defaults.baseURL = 'http://localhost:5001/api';
      try {
        await axios.get('/');
        console.log('✅ Connected to backend on port 5001');
        return true;
      } catch (err) {
        console.error('❌ Could not connect to backend on any port');
        return false;
      }
    }
  };

  useEffect(() => {
    const init = async () => {
      await testConnection();
      
      const token = localStorage.getItem('token');
      const userData = localStorage.getItem('user');
      
      if (token && userData) {
        setUser(JSON.parse(userData));
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
      setLoading(false);
    };
    
    init();
  }, []);

  const login = async (email, password, role) => {
    try {
      const response = await axios.post('/auth/login', {
        email,
        password,
        role
      });
      
      if (response.data.success) {
        const { token, ...userData } = response.data.data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        setUser(userData);
        setError(null);
        return { success: true };
      }
    } catch (error) {
      const errorMessage = error.response?.data?.reason || error.response?.data?.message || 'Login failed';
      setError(errorMessage);
      return { 
        success: false, 
        message: errorMessage 
      };
    }
  };

  const register = async (name, email, password, role, phoneNumber = '', address = '') => {
    try {
      const response = await axios.post('/auth/register', {
        name,
        email,
        password,
        role,
        phoneNumber,
        address
      });
      
      if (response.data.success) {
        const { token, ...userData } = response.data.data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        setUser(userData);
        setError(null);
        return { success: true };
      }
    } catch (error) {
      const errorMessage = error.response?.data?.reason || error.response?.data?.message || 'Registration failed';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  const value = {
    user,
    login,
    register,
    logout,
    error,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};