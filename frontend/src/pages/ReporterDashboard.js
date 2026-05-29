import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import PointsRedeem from '../components/PointsRedeem';
import './Dashboard.css';

const ReporterDashboard = () => {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [pendingVerification, setPendingVerification] = useState([]);
  const [recentReports, setRecentReports] = useState([]);
  const [rejectedJobs, setRejectedJobs] = useState([]);
  const [completedJobs, setCompletedJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddMoney, setShowAddMoney] = useState(false);
  const [addAmount, setAddAmount] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [selectedJob, setSelectedJob] = useState(null);
  const [verificationComment, setVerificationComment] = useState('');
  const [activeTab, setActiveTab] = useState('pending');
  const [walletBalance, setWalletBalance] = useState(user?.walletBalance || 0);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedCompletedJob, setSelectedCompletedJob] = useState(null);
  const [rating, setRating] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [hoverRating, setHoverRating] = useState(0);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (user) {
      setWalletBalance(user.walletBalance || 0);
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      console.log('=== FETCHING REPORTER DATA ===');
      
      const [statsRes, pendingRes, reportsRes, rejectedRes, completedRes] = await Promise.all([
        axios.get('/waste/stats'),
        axios.get('/waste/reports/pending-verification'),
        axios.get('/waste/reports'),
        axios.get('/waste/jobs/rejected'),
        axios.get('/waste/jobs/completed')
      ]);

      if (statsRes.data.success) {
        setStats(statsRes.data.data);
        console.log('Stats loaded:', statsRes.data.data);
      }
      
      if (pendingRes.data.success) {
        setPendingVerification(pendingRes.data.data);
        console.log('Pending verification:', pendingRes.data.data.length);
      }
      
      if (reportsRes.data.success) {
        setRecentReports(reportsRes.data.data);
        console.log('Recent reports:', reportsRes.data.data.length);
      }
      
      if (rejectedRes.data.success) {
        setRejectedJobs(rejectedRes.data.data);
        console.log('Rejected jobs:', rejectedRes.data.data.length);
      }
      
      if (completedRes.data.success) {
        setCompletedJobs(completedRes.data.data);
        console.log('Completed jobs:', completedRes.data.data.length);
      }
      
    } catch (error) {
      console.error('Error fetching data:', error);
      setMessage('Failed to load dashboard data');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const refreshUserData = async () => {
    try {
      console.log('Refreshing user data...');
      const response = await axios.get('/auth/me');
      if (response.data.success) {
        const updatedUser = { ...user, ...response.data.data };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        if (setUser) setUser(updatedUser);
        setWalletBalance(updatedUser.walletBalance);
        console.log('User data refreshed. New balance:', updatedUser.walletBalance);
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
  };

  const handleAddMoney = async () => {
    if (!addAmount || addAmount <= 0) {
      setMessage('Please enter a valid amount');
      setMessageType('error');
      return;
    }

    try {
      const response = await axios.post('/auth/add-money', { amount: Number(addAmount) });
      if (response.data.success) {
        const updatedUser = { ...user, walletBalance: response.data.walletBalance };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        if (setUser) setUser(updatedUser);
        setWalletBalance(response.data.walletBalance);
        setMessage(`✅ ${formatCurrency(addAmount)} added successfully!`);
        setMessageType('success');
        setAddAmount('');
        setShowAddMoney(false);
        fetchData();
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to add money');
      setMessageType('error');
    }
  };

  // Function to cancel a pending report before acceptance
  const handleCancelReport = async (reportId) => {
    if (!window.confirm('Are you sure you want to cancel this report? The money will be refunded to your wallet.')) {
      return;
    }

    setLoading(true);
    try {
      console.log('Cancelling report:', reportId);
      const response = await axios.put(`/waste/report/${reportId}/cancel`);
      
      if (response.data.success) {
        setMessage(response.data.message);
        setMessageType('success');
        
        // Update user context with new wallet balance
        const updatedUser = { ...user, walletBalance: response.data.walletBalance };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        if (setUser) setUser(updatedUser);
        setWalletBalance(response.data.walletBalance);
        
        // Refresh data to remove cancelled report
        await fetchData();
        
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage(response.data.message || 'Failed to cancel report');
        setMessageType('error');
      }
    } catch (error) {
      console.error('Cancel report error:', error);
      setMessage(error.response?.data?.message || 'Failed to cancel report');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (jobId, approved) => {
    setLoading(true);
    try {
      console.log('Sending verification:', { jobId, approved, comment: verificationComment });
      
      const response = await axios.post(`/waste/report/${jobId}/verify`, {
        approved,
        comment: verificationComment
      });
      
      console.log('Verification response:', response.data);
      
      if (response.data.success) {
        setMessage(response.data.message);
        setMessageType('success');
        setSelectedJob(null);
        setVerificationComment('');
        
        await refreshUserData();
        await fetchData();
        
        if (!approved) {
          setActiveTab('rejected');
          setMessage('Job rejected! Money refunded to your wallet.');
        } else {
          setActiveTab('completed');
          setMessage('Job approved! Payment released to cleaner.');
        }
        
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage(response.data.message || 'Verification failed');
        setMessageType('error');
      }
    } catch (error) {
      console.error('Verification error details:', error);
      setMessage(error.response?.data?.message || error.message || 'Verification failed');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRejection = async (reportId) => {
    if (!window.confirm('Are you sure you want to cancel this rejection? This will release the payment to the cleaner.')) {
      return;
    }

    setLoading(true);
    try {
      console.log('Cancelling rejection for job:', reportId);
      const response = await axios.post(`/waste/report/${reportId}/cancel-rejection`);
      
      if (response.data.success) {
        setMessage(response.data.message);
        setMessageType('success');
        await refreshUserData();
        await fetchData();
        setActiveTab('completed');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage(response.data.message || 'Failed to cancel rejection');
        setMessageType('error');
      }
    } catch (error) {
      console.error('Cancel rejection error:', error);
      setMessage(error.response?.data?.message || 'Failed to cancel rejection');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRating = async () => {
    if (rating === 0) {
      setMessage('Please select a rating');
      setMessageType('error');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`/waste/report/${selectedCompletedJob._id}/rate`, {
        rating,
        comment: ratingComment
      });
      
      if (response.data.success) {
        setMessage(response.data.message);
        setMessageType('success');
        setShowRatingModal(false);
        setRating(0);
        setRatingComment('');
        await fetchData();
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage(response.data.message || 'Failed to submit rating');
        setMessageType('error');
      }
    } catch (error) {
      console.error('Rating error:', error);
      setMessage(error.response?.data?.message || 'Failed to submit rating');
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

  const renderStars = (ratingValue, interactive = false, onClick = null, onHover = null) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span
          key={i}
          className={`star ${i <= (interactive ? hoverRating || ratingValue : ratingValue) ? 'filled' : ''}`}
          onClick={interactive ? () => onClick(i) : null}
          onMouseEnter={interactive ? () => onHover(i) : null}
          onMouseLeave={interactive ? () => onHover(0) : null}
          style={{ cursor: interactive ? 'pointer' : 'default' }}
        >
          ★
        </span>
      );
    }
    return stars;
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { class: 'status-pending', text: '💰 Pending', icon: '⏳' },
      accepted: { class: 'status-accepted', text: '✓ Accepted', icon: '👤' },
      'in-progress': { class: 'status-progress', text: '🔄 In Progress', icon: '🧹' },
      waiting_verification: { class: 'status-waiting', text: '⏳ Awaiting Verification', icon: '📸' },
      completed: { class: 'status-completed', text: '✅ Completed', icon: '✓' },
      rejected: { class: 'status-rejected', text: '❌ Rejected', icon: '✗' }
    };
    return badges[status] || badges.pending;
  };

  if (loading) return <div className="loading">Loading dashboard...</div>;

  return (
    <div className="dashboard-container reporter-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <h1>Welcome back, {user?.name}! 👋</h1>
          <p>Track your waste reports and manage your cleanups</p>
        </div>
        <div className="header-stats">
          <div className="stat-badge">
            <span className="stat-label">Reports</span>
            <span className="stat-number">{stats?.userStats?.totalReports || 0}</span>
          </div>
          <div className="stat-badge">
            <span className="stat-label">Verified</span>
            <span className="stat-number">{stats?.userStats?.totalVerified || 0}</span>
          </div>
          <div className="stat-badge">
            <span className="stat-label">Rejected</span>
            <span className="stat-number">{stats?.userStats?.totalRejected || 0}</span>
          </div>
          <div className="stat-badge">
            <span className="stat-label">Points</span>
            <span className="stat-number">⭐ {user?.points || 0}</span>
          </div>
          <div className="stat-badge">
            <span className="stat-label">Spent</span>
            <span className="stat-number">{formatCurrency(stats?.userStats?.totalSpent || 0)}</span>
          </div>
        </div>
      </div>

      {/* Wallet Section */}
      <div className="wallet-section">
        <div className="wallet-card">
          <div className="wallet-icon">💰</div>
          <div className="wallet-info">
            <h3>Wallet Balance</h3>
            <p className="wallet-amount">{formatCurrency(walletBalance)}</p>
            <button onClick={() => setShowAddMoney(!showAddMoney)} className="add-money-btn">
              {showAddMoney ? 'Cancel' : '+ Add Money'}
            </button>
          </div>
        </div>
        
        {showAddMoney && (
          <div className="add-money-form">
            <input
              type="number"
              placeholder="Enter amount in ₹"
              value={addAmount}
              onChange={(e) => setAddAmount(e.target.value)}
              min="10"
              step="10"
              autoFocus
            />
            <button onClick={handleAddMoney}>Add to Wallet</button>
            <small>Minimum: ₹10 | Maximum: ₹100,000</small>
          </div>
        )}
      </div>

      {/* Points Redemption Section */}
      <PointsRedeem 
        user={user} 
        onRedeem={(newBalance, newPoints) => {
          const updatedUser = { ...user, walletBalance: newBalance, points: newPoints };
          localStorage.setItem('user', JSON.stringify(updatedUser));
          if (setUser) setUser(updatedUser);
          setWalletBalance(newBalance);
          fetchData();
        }}
      />

      {message && (
        <div className={`message-banner ${messageType}`}>
          {message}
        </div>
      )}

      {/* Tabs */}
      <div className="dashboard-tabs">
        <button 
          className={activeTab === 'pending' ? 'tab-active' : 'tab'}
          onClick={() => setActiveTab('pending')}
        >
          ⏳ Pending Verification ({pendingVerification.length})
        </button>
        <button 
          className={activeTab === 'reports' ? 'tab-active' : 'tab'}
          onClick={() => setActiveTab('reports')}
        >
          📋 My Reports ({recentReports.length})
        </button>
        <button 
          className={activeTab === 'completed' ? 'tab-active' : 'tab'}
          onClick={() => setActiveTab('completed')}
        >
          ✅ Completed ({completedJobs.length})
        </button>
        <button 
          className={activeTab === 'rejected' ? 'tab-active' : 'tab'}
          onClick={() => setActiveTab('rejected')}
        >
          ❌ Rejected ({rejectedJobs.length})
        </button>
      </div>

      {/* Pending Verification Section */}
      {activeTab === 'pending' && (
        <div className="section">
          {pendingVerification.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">✅</div>
              <h3>No pending verification</h3>
              <p>When cleaners submit after-cleaning photos, they'll appear here for your review.</p>
            </div>
          ) : (
            <div className="verification-grid">
              {pendingVerification.map(job => (
                <div key={job._id} className="verification-card">
                  <div className="comparison-images">
                    <div className="before-image">
                      <img src={job.imageUrl} alt="Before cleaning" />
                      <span>Before</span>
                    </div>
                    <div className="after-image">
                      <img src={job.afterImage} alt="After cleaning" />
                      <span>After</span>
                    </div>
                  </div>
                  <div className="job-details">
                    <h4>Job Details</h4>
                    <p><strong>Location:</strong> {job.location?.address}</p>
                    <p><strong>Description:</strong> {job.description}</p>
                    <p><strong>Reward:</strong> {formatCurrency(job.paymentAmount)}</p>
                    <p><strong>Cleaned by:</strong> {job.acceptedBy?.name} ({job.acceptedBy?.email})</p>
                  </div>
                  {selectedJob === job._id ? (
                    <div className="verification-form">
                      <textarea
                        placeholder="Add a comment (optional)"
                        value={verificationComment}
                        onChange={(e) => setVerificationComment(e.target.value)}
                        rows="3"
                      />
                      <div className="verification-buttons">
                        <button 
                          onClick={() => handleVerify(job._id, true)}
                          className="btn-approve"
                          disabled={loading}
                        >
                          ✅ Approve & Release Payment
                        </button>
                        <button 
                          onClick={() => handleVerify(job._id, false)}
                          className="btn-reject"
                          disabled={loading}
                        >
                          ❌ Reject & Refund
                        </button>
                        <button 
                          onClick={() => setSelectedJob(null)}
                          className="btn-cancel"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setSelectedJob(job._id)}
                      className="btn-verify"
                    >
                      Verify Cleaning
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* My Reports Section with Cancel Button */}
      {activeTab === 'reports' && (
        <div className="section">
          <div className="section-header">
            <h2>📋 My Reports</h2>
            <p>Track all your waste reports and their current status</p>
          </div>
          
          {recentReports.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📸</div>
              <h3>No reports yet</h3>
              <p>Click "Report New Waste" to get started</p>
              <button onClick={() => navigate('/report')} className="btn-primary">
                Report Now
              </button>
            </div>
          ) : (
            <div className="reports-list">
              {recentReports.map(report => {
                const status = getStatusBadge(report.status);
                const canCancel = report.status === 'pending' && !report.acceptedBy;
                
                return (
                  <div key={report._id} className={`report-card ${report.status}`}>
                    <img src={report.imageUrl} alt="Waste" className="report-thumb" />
                    <div className="report-info">
                      <div className="report-header">
                        <div className={`status-badge ${report.status}`}>
                          {status.icon} {status.text}
                        </div>
                        <div className="reward">{formatCurrency(report.paymentAmount)}</div>
                      </div>
                      <p className="report-location">📍 {report.location?.address}</p>
                      <p className="report-desc">{report.description.substring(0, 100)}</p>
                      <div className="report-meta">
                        <span>🗑️ {report.wasteType}</span>
                        <span>⚠️ {report.severity}</span>
                        <span>📅 {new Date(report.createdAt).toLocaleDateString()}</span>
                      </div>
                      
                      {/* Cancel Report Button - Only for pending reports */}
                      {canCancel && (
                        <button 
                          onClick={() => handleCancelReport(report._id)}
                          className="btn-cancel-report"
                          disabled={loading}
                        >
                          ❌ Cancel Report & Get Refund
                        </button>
                      )}
                      
                      {report.verificationStatus === 'rejected' && report.verificationComment && (
                        <div className="rejection-reason">
                          <strong>Rejection reason:</strong> {report.verificationComment}
                        </div>
                      )}
                      
                      {report.acceptedBy && report.status === 'accepted' && (
                        <div className="accepted-info">
                          <strong>Accepted by:</strong> {report.acceptedBy.name}
                        </div>
                      )}
                      
                      {report.status === 'waiting_verification' && (
                        <div className="waiting-info">
                          <strong>⏳ Waiting for your verification</strong>
                          <button 
                            onClick={() => {
                              setActiveTab('pending');
                              setSelectedJob(report._id);
                            }}
                            className="btn-verify-small"
                          >
                            Verify Now
                          </button>
                        </div>
                      )}
                      
                      {report.status === 'completed' && (
                        <div className="completed-info">
                          <strong>✅ Completed by:</strong> {report.acceptedBy?.name}
                          {report.rating && report.rating > 0 ? (
                            <div className="rating-stars-small">{renderStars(report.rating)}</div>
                          ) : (
                            <button 
                              onClick={() => {
                                setSelectedCompletedJob(report);
                                setShowRatingModal(true);
                              }}
                              className="btn-rate-small"
                            >
                              Rate Cleaner
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Completed Jobs Section */}
      {activeTab === 'completed' && (
        <div className="section">
          {completedJobs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">✅</div>
              <h3>No completed jobs yet</h3>
              <p>Jobs you approve will appear here</p>
            </div>
          ) : (
            <div className="completed-list">
              {completedJobs.map(job => (
                <div key={job._id} className="completed-card">
                  <div className="completed-header">
                    <div className="completed-icon">✅</div>
                    <div className="completed-info">
                      <h4>Job Completed</h4>
                      <p>Reward: {formatCurrency(job.paymentAmount)}</p>
                      <p>Cleaned by: {job.acceptedBy?.name}</p>
                      <p>Completed: {new Date(job.completedAt || job.verifiedAt).toLocaleDateString()}</p>
                    </div>
                    <div className="rating-display">
                      {job.rating && job.rating > 0 ? (
                        <div>
                          <div className="rating-stars">{renderStars(job.rating)}</div>
                          {job.ratingComment && <p className="rating-comment">"{job.ratingComment}"</p>}
                        </div>
                      ) : (
                        <button 
                          onClick={() => {
                            setSelectedCompletedJob(job);
                            setShowRatingModal(true);
                          }}
                          className="btn-rate"
                        >
                          Rate Cleaner
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="completed-details">
                    <p><strong>Location:</strong> {job.location?.address}</p>
                    <p><strong>Description:</strong> {job.description.substring(0, 100)}</p>
                    {job.afterImage && (
                      <div className="after-image-small">
                        <img src={job.afterImage} alt="After cleaning" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Rejected Jobs Section */}
      {activeTab === 'rejected' && (
        <div className="section">
          <div className="section-header">
            <h2>❌ Rejected Jobs</h2>
            <p>Jobs you rejected during verification. You can cancel the rejection if it was a mistake.</p>
          </div>
          
          {rejectedJobs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">✓</div>
              <h3>No rejected jobs</h3>
              <p>All your jobs have been approved!</p>
            </div>
          ) : (
            <div className="rejected-list">
              {rejectedJobs.map(job => (
                <div key={job._id} className="rejected-card">
                  <div className="rejected-header">
                    <div className="rejected-icon">❌</div>
                    <div className="rejected-info">
                      <h4>Job Rejected</h4>
                      <p>Reward: {formatCurrency(job.paymentAmount)}</p>
                      <p>Cleaner would have received: {formatCurrency(job.paymentAmount * 0.9)}</p>
                    </div>
                  </div>
                  <div className="comparison-images small">
                    <div className="before-image">
                      <img src={job.imageUrl} alt="Before" />
                      <span>Before</span>
                    </div>
                    {job.afterImage && (
                      <div className="after-image">
                        <img src={job.afterImage} alt="After" />
                        <span>After</span>
                      </div>
                    )}
                  </div>
                  <div className="rejected-details">
                    <p><strong>Location:</strong> {job.location?.address}</p>
                    <p><strong>Description:</strong> {job.description}</p>
                    <p><strong>Rejection reason:</strong> {job.verificationComment || job.rejectionReason || 'Not specified'}</p>
                    <p><strong>Cleaned by:</strong> {job.acceptedBy?.name || 'Unknown'}</p>
                    <p><strong>Date:</strong> {new Date(job.rejectedAt || job.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="rejected-actions">
                    <button 
                      onClick={() => handleCancelRejection(job._id)}
                      className="btn-cancel-rejection"
                      disabled={loading}
                    >
                      ↺ Cancel Rejection & Release Payment
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Rating Modal */}
      {showRatingModal && selectedCompletedJob && (
        <div className="modal-overlay" onClick={() => setShowRatingModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Rate the Cleaner</h3>
            <p>How would you rate <strong>{selectedCompletedJob.acceptedBy?.name}</strong> for this job?</p>
            <div className="rating-input">
              {renderStars(rating, true, setRating, setHoverRating)}
            </div>
            <textarea
              placeholder="Leave a comment about the cleaner's work (optional)"
              value={ratingComment}
              onChange={(e) => setRatingComment(e.target.value)}
              rows="3"
            />
            <div className="modal-buttons">
              <button onClick={handleSubmitRating} className="btn-primary" disabled={loading}>
                Submit Rating
              </button>
              <button onClick={() => setShowRatingModal(false)} className="btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="quick-actions">
        <button onClick={() => navigate('/report')} className="action-btn primary">
          📸 Report New Waste
        </button>
        <button onClick={fetchData} className="action-btn secondary">
          🔄 Refresh Data
        </button>
      </div>
    </div>
  );
};

export default ReporterDashboard;