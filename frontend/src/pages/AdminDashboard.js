import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AnalyticsCharts from '../components/AnalyticsCharts';
import AIChatbot from '../components/AIChatbot';
import './Dashboard.css';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [cleaners, setCleaners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('commission');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  useEffect(() => {
    // Check if user is admin
    if (user && user.role !== 'admin') {
      setMessage('Access denied. Admin only.');
      setMessageType('error');
      setTimeout(() => {
        logout();
        navigate('/login');
      }, 2000);
      return;
    }
    if (user && user.role === 'admin') {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setMessage('');
      console.log('Fetching admin data...');
      
      const token = localStorage.getItem('token');
      
      if (!token) {
        setMessage('No authentication token found. Please login again.');
        setMessageType('error');
        setTimeout(() => {
          logout();
          navigate('/login');
        }, 2000);
        return;
      }
      
      // Fetch commission stats
      const statsRes = await axios.get('/admin/commission-stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      // Fetch all users
      const usersRes = await axios.get('/admin/all-users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      // Fetch all reports
      const reportsRes = await axios.get('/admin/all-reports', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (statsRes.data.success) {
        setStats(statsRes.data.data);
        console.log('Commission stats:', statsRes.data.data);
      }
      
      if (usersRes.data.success) {
        setUsers(usersRes.data.data);
        const cleanersList = usersRes.data.data.filter(u => u.role === 'cleaner');
        setCleaners(cleanersList);
        console.log('Users:', usersRes.data.data.length);
        console.log('Cleaners:', cleanersList.length);
      }
      
      if (reportsRes.data.success) {
        setReports(reportsRes.data.data);
        console.log('Reports:', reportsRes.data.data.length);
      }
      
    } catch (error) {
      console.error('Error fetching data:', error);
      setMessage(error.response?.data?.message || 'Failed to load dashboard data');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  // Calculate commission distribution for the pie chart
  const getCommissionDistribution = () => {
    const totalCompletedJobs = stats?.recentTransactions?.length || 0;
    let totalAdminCommission = 0;
    let totalCleanerCash = 0;
    let totalUserPoints = 0;
    let totalCleanerPoints = 0;

    stats?.recentTransactions?.forEach(transaction => {
      const paymentAmount = transaction.paymentAmount;
      const adminCommission = (paymentAmount * 8) / 100;      // 8% for admin
      const cleanerCash = (paymentAmount * 90) / 100;        // 90% for cleaner cash
      const userPoints = (paymentAmount * 1) / 100;          // 1% for user points
      const cleanerPoints = (paymentAmount * 1) / 100;       // 1% for cleaner points
      
      totalAdminCommission += adminCommission;
      totalCleanerCash += cleanerCash;
      totalUserPoints += userPoints;
      totalCleanerPoints += cleanerPoints;
    });

    return {
      totalAdminCommission,
      totalCleanerCash,
      totalUserPoints,
      totalCleanerPoints,
      totalJobs: totalCompletedJobs
    };
  };

  const distribution = getCommissionDistribution();

  if (loading) return <div className="loading">Loading admin dashboard...</div>;

  if (!user || user.role !== 'admin') {
    return (
      <div className="dashboard-container">
        <div className="message-banner error">
          Access denied. You don't have permission to view this page.
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container admin-dashboard">
      {/* Header with Admin Name */}
      <div className="dashboard-header">
        <div className="header-content">
          <h1>Welcome, {user?.name || 'Admin'}! 👑</h1>
          <p>Monitor platform activity and commission earnings</p>
        </div>
        <div className="header-stats">
          <div className="stat-badge">
            <span className="stat-label">Total Commission</span>
            <span className="stat-number">₹{distribution.totalAdminCommission.toLocaleString()}</span>
          </div>
          <div className="stat-badge">
            <span className="stat-label">Total Jobs</span>
            <span className="stat-number">{stats?.totalJobs || 0}</span>
          </div>
          <div className="stat-badge">
            <span className="stat-label">Total Users</span>
            <span className="stat-number">{users.length}</span>
          </div>
          <div className="stat-badge">
            <span className="stat-label">Cleaners</span>
            <span className="stat-number">{cleaners.length}</span>
          </div>
        </div>
      </div>

      {message && (
        <div className={`message-banner ${messageType}`}>
          {message}
        </div>
      )}

      {/* Stats Cards */}
      <div className="stats-cards">
        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-info">
            <h3>Total Commission Collected</h3>
            <p className="stat-value">₹{distribution.totalAdminCommission.toLocaleString()}</p>

          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-info">
            <h3>Average Commission</h3>
            <p className="stat-value">₹{(distribution.totalAdminCommission / (stats?.totalJobs || 1)).toLocaleString()}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🎯</div>
          <div className="stat-info">
            <h3>Total Payment Processed</h3>
            <p className="stat-value">{formatCurrency(stats?.totalPayments || 0)}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⭐</div>
          <div className="stat-info">
            <h3>Commission Rate</h3>
            <p className="stat-value">8%</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="dashboard-tabs">
        <button 
          className={activeTab === 'commission' ? 'tab-active' : 'tab'}
          onClick={() => setActiveTab('commission')}
        >
          💰 Commission Stats
        </button>
        <button 
          className={activeTab === 'transactions' ? 'tab-active' : 'tab'}
          onClick={() => setActiveTab('transactions')}
        >
          📋 Recent Transactions
        </button>
        <button 
          className={activeTab === 'monthly' ? 'tab-active' : 'tab'}
          onClick={() => setActiveTab('monthly')}
        >
          📅 Monthly Breakdown
        </button>
        <button 
          className={activeTab === 'users' ? 'tab-active' : 'tab'}
          onClick={() => setActiveTab('users')}
        >
          👥 Users ({users.length})
        </button>
        <button 
          className={activeTab === 'cleaners' ? 'tab-active' : 'tab'}
          onClick={() => setActiveTab('cleaners')}
        >
          🧹 Cleaners ({cleaners.length})
        </button>
        <button 
          className={activeTab === 'reports' ? 'tab-active' : 'tab'}
          onClick={() => setActiveTab('reports')}
        >
          📝 All Reports ({reports.length})
        </button>
      </div>

      {/* Commission Stats Section with Charts */}
      {activeTab === 'commission' && (
        <div className="section">
          <AnalyticsCharts 
            stats={{
              ...stats,
              totalAdminCommission: distribution.totalAdminCommission,
              totalCleanerCash: distribution.totalCleanerCash,
              totalUserPoints: distribution.totalUserPoints,
              totalCleanerPoints: distribution.totalCleanerPoints
            }}
            monthlyStats={stats?.monthlyStats}
            recentTransactions={stats?.recentTransactions}
          />
        </div>
      )}

      {/* Recent Transactions */}
      {activeTab === 'transactions' && (
        <div className="section">
          <h2>Recent Transactions</h2>
          {!stats?.recentTransactions || stats.recentTransactions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <h3>No transactions yet</h3>
              <p>Transactions will appear here when jobs are completed</p>
            </div>
          ) : (
            <div className="transactions-list">
              {stats.recentTransactions.map(transaction => {
                const adminCommission = (transaction.paymentAmount * 8) / 100;
                const cleanerCash = (transaction.paymentAmount * 90) / 100;
                const userPoints = (transaction.paymentAmount * 1) / 100;
                const cleanerPoints = (transaction.paymentAmount * 1) / 100;
                
                return (
                  <div key={transaction._id} className="transaction-card">
                    <div className="transaction-header">
                      <div className="transaction-icon">💰</div>
                      <div className="transaction-info">
                        <h4>Job Completed</h4>
                        <p>Amount: {formatCurrency(transaction.paymentAmount)}</p>
                      </div>
                    </div>
                    <div className="transaction-details">
                      <p><strong>Admin Commission (8%):</strong> {formatCurrency(adminCommission)}</p>
                      <p><strong>Cleaner Cash (90%):</strong> {formatCurrency(cleanerCash)}</p>
                      <p><strong>User Points (1%):</strong> {Math.floor(userPoints)} points</p>
                      <p><strong>Cleaner Points (1%):</strong> {Math.floor(cleanerPoints)} points</p>
                      <p><strong>Reported by:</strong> {transaction.user?.name || 'Unknown'}</p>
                      <p><strong>Cleaned by:</strong> {transaction.acceptedBy?.name || 'Unknown'}</p>
                      <p><strong>Date:</strong> {new Date(transaction.completedAt).toLocaleString()}</p>
                      <p><strong>Location:</strong> {transaction.location?.address}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Monthly Breakdown */}
      {activeTab === 'monthly' && (
        <div className="section">
          <h2>Monthly Commission Breakdown</h2>
          {!stats?.monthlyStats || stats.monthlyStats.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📅</div>
              <h3>No monthly data yet</h3>
            </div>
          ) : (
            <div className="monthly-list">
              {stats.monthlyStats.map(month => {
                const totalAdminCommission = (month.totalAmount * 8) / 100;
                const totalCleanerCash = (month.totalAmount * 90) / 100;
                const totalUserPoints = (month.totalAmount * 1) / 100;
                const totalCleanerPoints = (month.totalAmount * 1) / 100;
                
                return (
                  <div key={`${month._id.year}-${month._id.month}`} className="monthly-card">
                    <div className="monthly-header">
                      <h3>{new Date(month._id.year, month._id.month - 1).toLocaleString('default', { month: 'long' })} {month._id.year}</h3>
                    </div>
                    <div className="monthly-details">
                      <p><strong>Total Jobs:</strong> {month.totalJobs}</p>
                      <p><strong>Total Amount:</strong> {formatCurrency(month.totalAmount)}</p>
                      <p><strong>Admin Commission (8%):</strong> {formatCurrency(totalAdminCommission)}</p>
                      <p><strong>Cleaner Cash (90%):</strong> {formatCurrency(totalCleanerCash)}</p>
                      <p><strong>User Points (1%):</strong> {Math.floor(totalUserPoints)} pts</p>
                      <p><strong>Cleaner Points (1%):</strong> {Math.floor(totalCleanerPoints)} pts</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* All Users Section */}
      {activeTab === 'users' && (
        <div className="section">
          <h2>All Platform Users</h2>
          {users.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">👥</div>
              <h3>No users yet</h3>
            </div>
          ) : (
            <div className="users-list">
              {users.map(userItem => (
                <div key={userItem._id} className="user-card">
                  <div className="user-header">
                    <div className="user-icon">
                      {userItem.role === 'user' ? '👤' : userItem.role === 'cleaner' ? '🧹' : '👑'}
                    </div>
                    <div className="user-info">
                      <h4>{userItem.name}</h4>
                      <p>{userItem.email}</p>
                      <p className="user-role">Role: {userItem.role}</p>
                    </div>
                  </div>
                  <div className="user-stats">
                    <p><strong>Wallet:</strong> {formatCurrency(userItem.walletBalance)}</p>
                    <p><strong>Total Earned:</strong> {formatCurrency(userItem.totalEarned)}</p>
                    <p><strong>Total Spent:</strong> {formatCurrency(userItem.totalSpent)}</p>
                    {userItem.role === 'cleaner' && (
                      <>
                        <p><strong>Jobs Completed:</strong> {userItem.completedJobs}</p>
                        <p><strong>Rating:</strong> {userItem.rating?.toFixed(1) || 0}⭐</p>
                      </>
                    )}
                    {userItem.role === 'user' && (
                      <>
                        <p><strong>Reports Made:</strong> {userItem.totalReports}</p>
                        <p><strong>Verified:</strong> {userItem.totalVerified}</p>
                        <p><strong>Rejected:</strong> {userItem.totalRejected}</p>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Cleaners Only Section */}
      {activeTab === 'cleaners' && (
        <div className="section">
          <h2>All Cleaners</h2>
          {cleaners.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🧹</div>
              <h3>No cleaners yet</h3>
            </div>
          ) : (
            <div className="users-list">
              {cleaners.map(cleaner => (
                <div key={cleaner._id} className="user-card cleaner-card">
                  <div className="user-header">
                    <div className="user-icon">🧹</div>
                    <div className="user-info">
                      <h4>{cleaner.name}</h4>
                      <p>{cleaner.email}</p>
                      <p className="user-role">Cleaner</p>
                    </div>
                  </div>
                  <div className="user-stats">
                    <p><strong>Wallet:</strong> {formatCurrency(cleaner.walletBalance)}</p>
                    <p><strong>Total Earned:</strong> {formatCurrency(cleaner.totalEarned)}</p>
                    <p><strong>Jobs Completed:</strong> {cleaner.completedJobs}</p>
                    <p><strong>Rating:</strong> {cleaner.rating?.toFixed(1) || 0}⭐ ({cleaner.totalRatings} ratings)</p>
                    <p><strong>Rejected Jobs:</strong> {cleaner.totalRejected}</p>
                    <p><strong>Points Earned:</strong> {Math.floor(cleaner.totalPointsEarned || 0)} pts</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* All Reports Section */}
      {activeTab === 'reports' && (
        <div className="section">
          <h2>All Waste Reports</h2>
          {reports.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📝</div>
              <h3>No reports yet</h3>
            </div>
          ) : (
            <div className="reports-list">
              {reports.map(report => {
                const adminCommission = (report.paymentAmount * 8) / 100;
                const cleanerCash = (report.paymentAmount * 90) / 100;
                const userPoints = (report.paymentAmount * 1) / 100;
                const cleanerPoints = (report.paymentAmount * 1) / 100;
                
                return (
                  <div key={report._id} className="report-card">
                    <img src={report.imageUrl} alt="Waste" className="report-thumb" />
                    <div className="report-info">
                      <div className="report-header">
                        <div className={`status-badge ${report.status}`}>
                          {report.status === 'pending' ? '💰 Pending' : 
                           report.status === 'accepted' ? '✓ Accepted' :
                           report.status === 'in-progress' ? '🔄 In Progress' :
                           report.status === 'waiting_verification' ? '⏳ Awaiting Verification' :
                           report.status === 'completed' ? '✅ Completed' : report.status}
                        </div>
                        <div className="reward">{formatCurrency(report.paymentAmount)}</div>
                      </div>
                      <p className="report-location">📍 {report.location?.address}</p>
                      <p className="report-desc">{report.description.substring(0, 100)}</p>
                      <div className="report-meta">
                        <span>Reported by: {report.user?.name || 'Unknown'}</span>
                        <span>Cleaned by: {report.acceptedBy?.name || 'Not assigned'}</span>
                        <span>📅 {new Date(report.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="commission-info">
                        <span>💰 Admin (8%): {formatCurrency(adminCommission)}</span>
                        <span>🧹 Cleaner Cash (90%): {formatCurrency(cleanerCash)}</span>
                        <span>⭐ User Points (1%): {Math.floor(userPoints)} pts</span>
                        <span>⭐ Cleaner Points (1%): {Math.floor(cleanerPoints)} pts</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div className="quick-actions">
        <button onClick={fetchData} className="action-btn primary">
          🔄 Refresh Data
        </button>
        <button onClick={logout} className="action-btn secondary">
          🚪 Logout
        </button>
      </div>

      {/* AI Chatbot - Floating Assistant */}
      <AIChatbot 
        stats={stats}
        users={users}
        cleaners={cleaners}
        reports={reports}
      />
    </div>
  );
};

export default AdminDashboard;