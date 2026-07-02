import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ============================================
  // AXIOS CONFIGURATION
  // ============================================
  
  // Set axios default config
  axios.defaults.baseURL = 'https://waste-management-system-backend-9bl7.onrender.com/api';
  axios.defaults.timeout = 30000; // 30 seconds timeout
  axios.defaults.withCredentials = true; // Send cookies with requests
  axios.defaults.headers.common['Content-Type'] = 'application/json';
  axios.defaults.headers.common['Accept'] = 'application/json';

  // ============================================
  // REQUEST INTERCEPTOR (Add token to every request)
  // ============================================
  axios.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // ============================================
  // RESPONSE INTERCEPTOR (Handle errors globally)
  // ============================================
  axios.interceptors.response.use(
    (response) => {
      return response;
    },
    (error) => {
      // Handle unauthorized errors (401)
      if (error.response?.status === 401) {
        console.log('Unauthorized access - logging out');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        delete axios.defaults.headers.common['Authorization'];
        setUser(null);
        
        // Redirect to login page if not already there
        if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
          window.location.href = '/login';
        }
      }
      
      // Handle forbidden errors (403)
      if (error.response?.status === 403) {
        console.log('Forbidden access');
        // You can show a notification here
      }
      
      // Handle server errors (500)
      if (error.response?.status === 500) {
        console.error('Server error:', error.response?.data);
      }
      
      // Handle network errors
      if (error.code === 'ECONNABORTED') {
        console.error('Request timeout - server not responding');
      }
      
      if (error.message === 'Network Error') {
        console.error('Network error - check your connection');
      }
      
      return Promise.reject(error);
    }
  );

  // ============================================
  // LOAD USER FROM LOCAL STORAGE ON MOUNT
  // ============================================
  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem('token');
      const userData = localStorage.getItem('user');
      
      if (token && userData) {
        try {
          // Set token in headers
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          // Verify token is still valid by fetching user data
          const response = await axios.get('/auth/me');
          
          if (response.data.success) {
            setUser(response.data.data);
            // Update localStorage with fresh user data
            localStorage.setItem('user', JSON.stringify(response.data.data));
          } else {
            // Token is invalid, clear storage
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            delete axios.defaults.headers.common['Authorization'];
          }
        } catch (error) {
          console.error('Error loading user:', error);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          delete axios.defaults.headers.common['Authorization'];
        }
      }
      setLoading(false);
    };
    
    loadUser();
  }, []);

  // ============================================
  // VALIDATION FUNCTIONS
  // ============================================
  const validateEmail = (email) => {
    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password) => {
    return password.length >= 6;
  };

  const validateName = (name) => {
    return name && name.trim().length >= 2 && name.trim().length <= 50;
  };

  const validatePhoneNumber = (phone) => {
    if (!phone) return true;
    const phoneRegex = /^[0-9]{10}$/;
    return phoneRegex.test(phone);
  };

  // ============================================
  // LOGIN FUNCTION
  // ============================================
  const login = async (email, password, role) => {
    // Client-side validation
    if (!email || !password) {
      setError('Please provide email and password');
      return { success: false, message: 'Please provide email and password' };
    }
    
    if (!validateEmail(email)) {
      setError('Please provide a valid email address');
      return { success: false, message: 'Please provide a valid email address' };
    }
    
    try {
      console.log('Logging in...');
      const response = await axios.post('/auth/login', {
        email: email.toLowerCase().trim(),
        password,
        role
      });
      
      if (response.data.success) {
        const { token, ...userData } = response.data.data;
        
        // Store token and user data
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        setUser(userData);
        setError(null);
        
        console.log('Login successful for:', userData.email);
        return { success: true, user: userData };
      }
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = error.response?.data?.reason || 
                          error.response?.data?.message || 
                          'Login failed. Please try again.';
      setError(errorMessage);
      return { 
        success: false, 
        message: errorMessage 
      };
    }
  };

  // ============================================
  // REGISTER FUNCTION
  // ============================================
  const register = async (name, email, password, role, phoneNumber = '', address = '') => {
    // Client-side validation
    if (!validateName(name)) {
      setError('Name must be between 2 and 50 characters');
      return { success: false, message: 'Name must be between 2 and 50 characters' };
    }
    
    if (!validateEmail(email)) {
      setError('Please provide a valid email address');
      return { success: false, message: 'Please provide a valid email address' };
    }
    
    if (!validatePassword(password)) {
      setError('Password must be at least 6 characters long');
      return { success: false, message: 'Password must be at least 6 characters long' };
    }
    
    if (phoneNumber && !validatePhoneNumber(phoneNumber)) {
      setError('Please provide a valid 10-digit phone number');
      return { success: false, message: 'Please provide a valid 10-digit phone number' };
    }
    
    try {
      console.log('Registering new user...');
      const response = await axios.post('/auth/register', {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password,
        role,
        phoneNumber,
        address: address.trim()
      });
      
      if (response.data.success) {
        const { token, ...userData } = response.data.data;
        
        // Store token and user data
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        setUser(userData);
        setError(null);
        
        console.log('Registration successful for:', userData.email);
        return { success: true, user: userData };
      }
    } catch (error) {
      console.error('Registration error:', error);
      const errorMessage = error.response?.data?.reason || 
                          error.response?.data?.message || 
                          'Registration failed. Please try again.';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    }
  };

  // ============================================
  // LOGOUT FUNCTION
  // ============================================
  const logout = async () => {
    try {
      // Optional: Call logout endpoint to invalidate token on server
      await axios.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local storage and state regardless of server response
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      delete axios.defaults.headers.common['Authorization'];
      setUser(null);
      setError(null);
      console.log('Logged out successfully');
    }
  };

  // ============================================
  // UPDATE USER PROFILE
  // ============================================
  const updateProfile = async (profileData) => {
    try {
      const response = await axios.put('/auth/update-profile', profileData);
      
      if (response.data.success) {
        // Update user in state and localStorage
        const updatedUser = { ...user, ...response.data.data };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        return { success: true, message: response.data.message };
      }
    } catch (error) {
      console.error('Profile update error:', error);
      const errorMessage = error.response?.data?.message || 'Failed to update profile';
      return { success: false, message: errorMessage };
    }
  };

  // ============================================
  // CHANGE PASSWORD
  // ============================================
  const changePassword = async (currentPassword, newPassword) => {
    if (!validatePassword(newPassword)) {
      return { success: false, message: 'New password must be at least 6 characters long' };
    }
    
    try {
      const response = await axios.post('/auth/change-password', {
        currentPassword,
        newPassword
      });
      
      if (response.data.success) {
        return { success: true, message: response.data.message };
      }
    } catch (error) {
      console.error('Password change error:', error);
      const errorMessage = error.response?.data?.message || 'Failed to change password';
      return { success: false, message: errorMessage };
    }
  };

  // ============================================
  // REFRESH USER DATA
  // ============================================
  const refreshUserData = async () => {
    try {
      const response = await axios.get('/auth/me');
      if (response.data.success) {
        const updatedUser = { ...user, ...response.data.data };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        return { success: true, user: updatedUser };
      }
    } catch (error) {
      console.error('Refresh user data error:', error);
      return { success: false };
    }
  };

  // ============================================
  // CLEAR ERROR
  // ============================================
  const clearError = () => {
    setError(null);
  };

  // ============================================
  // CONTEXT VALUE
  // ============================================
  const value = {
    user,
    setUser,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    refreshUserData,
    clearError,
    error,
    loading,
    isAuthenticated: !!user,
    userRole: user?.role || null,
    userName: user?.name || '',
    userEmail: user?.email || '',
    walletBalance: user?.walletBalance || 0,
    userPoints: user?.points || 0
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;