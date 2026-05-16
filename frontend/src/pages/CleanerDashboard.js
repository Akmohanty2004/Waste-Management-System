import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import PointsRedeem from '../components/PointsRedeem';
import './Dashboard.css';

const CleanerDashboard = () => {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [availableJobs, setAvailableJobs] = useState([]);
  const [activeJobs, setActiveJobs] = useState([]);
  const [waitingVerification, setWaitingVerification] = useState([]);
  const [rejectedJobs, setRejectedJobs] = useState([]);
  const [completedJobs, setCompletedJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState(null);
  const [afterImage, setAfterImage] = useState(null);
  const [afterImagePreview, setAfterImagePreview] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [activeTab, setActiveTab] = useState('available');
  const [walletBalance, setWalletBalance] = useState(user?.walletBalance || 0);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedCompletedJob, setSelectedCompletedJob] = useState(null);
  const [rating, setRating] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [hoverRating, setHoverRating] = useState(0);
  const [userPoints, setUserPoints] = useState(user?.points || 0);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (user) {
      setWalletBalance(user.walletBalance || 0);
      setUserPoints(user.points || 0);
    }
  }, [user]);

  const getCleanerAmount = (paymentAmount) => {
    // 1% points for cleaner, 1% points for user, 8% admin commission, 90% cleaner cash
    const cleanerCash = (paymentAmount * 90) / 100;
    return cleanerCash;
  };

  const getCleanerPoints = (paymentAmount) => {
    // 1% of payment as points for cleaner
    return Math.floor((paymentAmount * 1) / 100);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      console.log('=== FETCHING CLEANER DASHBOARD DATA ===');
      
      const [statsRes, reportsRes, activeRes, waitingRes, rejectedRes, completedRes] = await Promise.all([
        axios.get('/waste/stats'),
        axios.get('/waste/reports'),
        axios.get('/waste/jobs/my-active'),
        axios.get('/waste/jobs/waiting-verification'),
        axios.get('/waste/jobs/rejected'),
        axios.get('/waste/jobs/completed')
      ]);

      if (statsRes.data.success) {
        setStats(statsRes.data.data);
        if (statsRes.data.data.userStats?.walletBalance !== undefined) {
          setWalletBalance(statsRes.data.data.userStats.walletBalance);
        }
        if (statsRes.data.data.userStats?.points !== undefined) {
          setUserPoints(statsRes.data.data.userStats.points);
        }
        console.log('Stats loaded:', statsRes.data.data);
        console.log('Cleaner points from stats:', statsRes.data.data.userStats?.points);
      }
      
      if (reportsRes.data.success) {
        const available = reportsRes.data.data.filter(job => 
          job.status === 'pending' && job.verificationStatus !== 'rejected'
        );
        setAvailableJobs(available);
        console.log('Available jobs:', available.length);
      }
      
      if (activeRes.data.success) {
        setActiveJobs(activeRes.data.data);
        console.log('Active jobs:', activeRes.data.data.length);
      }
      
      if (waitingRes.data.success) {
        setWaitingVerification(waitingRes.data.data);
        console.log('Waiting verification:', waitingRes.data.data.length);
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
        setUserPoints(updatedUser.points || 0);
        console.log('User data refreshed. New balance:', updatedUser.walletBalance);
        console.log('User points:', updatedUser.points);
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
  };

  const handleAcceptJob = async (jobId) => {
    setLoading(true);
    try {
      console.log('Accepting job:', jobId);
      const response = await axios.post(`/waste/report/${jobId}/accept`);
      
      if (response.data.success) {
        setMessage(response.data.message);
        setMessageType('success');
        await fetchData();
        await refreshUserData();
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage(response.data.message || 'Failed to accept job');
        setMessageType('error');
      }
    } catch (error) {
      console.error('Accept job error:', error);
      setMessage(error.response?.data?.message || 'Failed to accept job');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelJob = async (jobId) => {
    if (!window.confirm('Are you sure you want to cancel this job? It will become available for other cleaners.')) {
      return;
    }

    setLoading(true);
    try {
      const response = await axios.delete(`/waste/report/${jobId}/delete-cleaner-job`);
      
      if (response.data.success) {
        setMessage(response.data.message);
        setMessageType('success');
        await fetchData();
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage(response.data.message || 'Failed to cancel job');
        setMessageType('error');
      }
    } catch (error) {
      console.error('Cancel job error:', error);
      setMessage(error.response?.data?.message || 'Failed to cancel job');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadAfterPhoto = async (jobId) => {
    if (!afterImage) {
      setMessage('Please upload an after-cleaning photo');
      setMessageType('error');
      return;
    }

    setLoading(true);
    try {
      console.log('Uploading after photo for job:', jobId);
      const response = await axios.post(`/waste/report/${jobId}/upload-after`, {
        afterImage: afterImagePreview
      });
      
      if (response.data.success) {
        setMessage(response.data.message);
        setMessageType('success');
        setSelectedJob(null);
        setAfterImage(null);
        setAfterImagePreview('');
        await fetchData();
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage(response.data.message || 'Failed to upload photo');
        setMessageType('error');
      }
    } catch (error) {
      console.error('Upload photo error:', error);
      setMessage(error.response?.data?.message || 'Failed to upload photo');
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
        setMessage('Thank you for your rating!');
        setMessageType('success');
        setShowRatingModal(false);
        setRating(0);
        setRatingComment('');
        await fetchData();
        await refreshUserData();
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

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setMessage('Image size should be less than 5MB');
        setMessageType('error');
        return;
      }
      setAfterImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAfterImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
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
          style={{ cursor: interactive ? 'pointer' : 'default', fontSize: '1.2rem' }}
        >
          ★
        </span>
      );
    }
    return stars;
  };

  // Handle points redemption
  const handlePointsRedeem = (newBalance, newPoints) => {
    const updatedUser = { ...user, walletBalance: newBalance, points: newPoints };
    localStorage.setItem('user', JSON.stringify(updatedUser));
    if (setUser) setUser(updatedUser);
    setWalletBalance(newBalance);
    setUserPoints(newPoints);
    fetchData();
  };

  if (loading) return <div className="loading">Loading dashboard...</div>;

  return (
    <div className="dashboard-container cleaner-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <h1>Welcome back, {user?.name}! 🧹</h1>
          <p>Find cleaning jobs and earn money while keeping your city clean</p>
        </div>
        <div className="header-stats">
          <div className="stat-badge">
            <span className="stat-label">Total Earned</span>
            <span className="stat-number">{formatCurrency(stats?.userStats?.totalEarned || 0)}</span>
          </div>
          <div className="stat-badge">
            <span className="stat-label">Jobs Done</span>
            <span className="stat-number">{stats?.userStats?.completedJobs || 0}</span>
          </div>
          <div className="stat-badge">
            <span className="stat-label">Rating</span>
            <span className="stat-number">{stats?.userStats?.rating?.toFixed(1) || 0}⭐</span>
          </div>
          <div className="stat-badge">
            <span className="stat-label">Points</span>
            <span className="stat-number">⭐ {userPoints || 0}</span>
          </div>
          <div className="stat-badge">
            <span className="stat-label">Rejected</span>
            <span className="stat-number">{stats?.userStats?.totalRejected || 0}</span>
          </div>
        </div>
      </div>

      {/* Wallet Section */}
      <div className="wallet-section">
        <div className="wallet-card">
          <div className="wallet-icon">💰</div>
          <div className="wallet-info">
            <h3>Your Wallet Balance</h3>
            <p className="wallet-amount">{formatCurrency(walletBalance)}</p>
            <p className="wallet-sub">Total earned: {formatCurrency(stats?.userStats?.totalEarned || 0)}</p>
            {stats?.userStats?.totalRejected > 0 && (
              <p className="wallet-warning">⚠️ {stats.userStats.totalRejected} job(s) were rejected</p>
            )}
          </div>
        </div>
      </div>

      {/* Points Redemption Section */}
      <PointsRedeem 
        user={{ ...user, points: userPoints }} 
        onRedeem={handlePointsRedeem}
      />

      {message && (
        <div className={`message-banner ${messageType}`}>
          {message}
        </div>
      )}

      {/* Stats Cards */}
      <div className="stats-cards">
        <div className="stat-card" onClick={() => setActiveTab('available')}>
          <div className="stat-icon">💰</div>
          <div className="stat-info">
            <h3>Available Jobs</h3>
            <p className="stat-value">{availableJobs.length}</p>
          </div>
        </div>
        <div className="stat-card" onClick={() => setActiveTab('active')}>
          <div className="stat-icon">🔄</div>
          <div className="stat-info">
            <h3>Active Jobs</h3>
            <p className="stat-value">{activeJobs.length}</p>
          </div>
        </div>
        <div className="stat-card" onClick={() => setActiveTab('waiting')}>
          <div className="stat-icon">⏳</div>
          <div className="stat-info">
            <h3>Pending Verification</h3>
            <p className="stat-value">{waitingVerification.length}</p>
          </div>
        </div>
        <div className="stat-card" onClick={() => setActiveTab('completed')}>
          <div className="stat-icon">✅</div>
          <div className="stat-info">
            <h3>Completed Jobs</h3>
            <p className="stat-value">{completedJobs.length}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="dashboard-tabs">
        <button className={activeTab === 'available' ? 'tab-active' : 'tab'} onClick={() => setActiveTab('available')}>
          💰 Available ({availableJobs.length})
        </button>
        <button className={activeTab === 'active' ? 'tab-active' : 'tab'} onClick={() => setActiveTab('active')}>
          🔄 Active ({activeJobs.length})
        </button>
        <button className={activeTab === 'waiting' ? 'tab-active' : 'tab'} onClick={() => setActiveTab('waiting')}>
          ⏳ Pending Verification ({waitingVerification.length})
        </button>
        <button className={activeTab === 'completed' ? 'tab-active' : 'tab'} onClick={() => setActiveTab('completed')}>
          ✅ Completed ({completedJobs.length})
        </button>
        <button className={activeTab === 'rejected' ? 'tab-active' : 'tab'} onClick={() => setActiveTab('rejected')}>
          ❌ Rejected ({rejectedJobs.length})
        </button>
      </div>

      {/* Available Jobs */}
      {activeTab === 'available' && (
        <div className="section">
          {availableJobs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🧹</div>
              <h3>No available jobs</h3>
              <p>Check back later for new waste reports</p>
            </div>
          ) : (
            <div className="jobs-grid">
              {availableJobs.map(job => (
                <div key={job._id} className="job-card">
                  <img src={job.imageUrl} alt="Waste" className="job-image" />
                  <div className="job-content">
                    <div className="reward">{formatCurrency(getCleanerAmount(job.paymentAmount))}</div>
                    <p className="job-description">{job.description.substring(0, 100)}</p>
                    <div className="job-location">📍 {job.location?.address}</div>
                    <div className="job-meta">
                      <span>🗑️ {job.wasteType}</span>
                      <span className={`severity-${job.severity}`}>⚠️ {job.severity}</span>
                      <span>⭐ +{getCleanerPoints(job.paymentAmount)} points</span>
                    </div>
                    <button onClick={() => handleAcceptJob(job._id)} className="btn-accept" disabled={loading}>
                      Accept Job
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Active Jobs */}
      {activeTab === 'active' && (
        <div className="section">
          {activeJobs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🔄</div>
              <h3>No active jobs</h3>
              <p>Accept a job to get started</p>
            </div>
          ) : (
            <div className="jobs-grid">
              {activeJobs.map(job => (
                <div key={job._id} className="job-card active">
                  <img src={job.imageUrl} alt="Waste" className="job-image" />
                  <div className="job-content">
                    <div className="reward">{formatCurrency(getCleanerAmount(job.paymentAmount))}</div>
                    <p className="job-description">{job.description.substring(0, 100)}</p>
                    <div className="job-location">📍 {job.location?.address}</div>
                    <div className="job-meta">
                      <span>Status: {job.status === 'accepted' ? 'Ready to clean' : 'In Progress'}</span>
                      <span>⭐ +{getCleanerPoints(job.paymentAmount)} points</span>
                    </div>
                    {selectedJob === job._id ? (
                      <div className="upload-form">
                        <input type="file" accept="image/*" onChange={handleImageChange} className="file-input" />
                        {afterImagePreview && <img src={afterImagePreview} alt="Preview" className="preview-image" />}
                        <div className="upload-buttons">
                          <button onClick={() => handleUploadAfterPhoto(job._id)} className="btn-upload" disabled={loading}>
                            Submit for Verification
                          </button>
                          <button onClick={() => setSelectedJob(null)} className="btn-cancel">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="active-buttons">
                        <button onClick={() => setSelectedJob(job._id)} className="btn-upload-photo" disabled={loading}>
                          📸 Upload After-Cleaning Photo
                        </button>
                        <button onClick={() => handleCancelJob(job._id)} className="btn-cancel-job" disabled={loading}>
                          Cancel Job
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Waiting Verification */}
      {activeTab === 'waiting' && (
        <div className="section">
          {waitingVerification.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">⏳</div>
              <h3>No jobs waiting for verification</h3>
              <p>Submit after-cleaning photos for verification</p>
            </div>
          ) : (
            <div className="waiting-list">
              {waitingVerification.map(job => (
                <div key={job._id} className="waiting-card">
                  <div className="comparison">
                    <div className="before"><img src={job.imageUrl} alt="Before" /><span>Before</span></div>
                    <div className="after"><img src={job.afterImage} alt="After" /><span>After</span></div>
                  </div>
                  <div className="waiting-info">
                    <p><strong>Location:</strong> {job.location?.address}</p>
                    <p><strong>Description:</strong> {job.description.substring(0, 100)}</p>
                    <p><strong>You Will Earn:</strong> {formatCurrency(getCleanerAmount(job.paymentAmount))}</p>
                    <p><strong>Points:</strong> ⭐ +{getCleanerPoints(job.paymentAmount)} points</p>
                    <p><strong>Status:</strong> <span className="status-waiting">⏳ Awaiting Reporter Approval</span></p>
                    <p><small>Submitted: {new Date(job.completedAt).toLocaleString()}</small></p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Completed Jobs */}
      {activeTab === 'completed' && (
        <div className="section">
          {completedJobs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">✅</div>
              <h3>No completed jobs yet</h3>
              <p>Jobs you complete will appear here</p>
            </div>
          ) : (
            <div className="completed-list">
              {completedJobs.map(job => (
                <div key={job._id} className="completed-card">
                  <div className="completed-header">
                    <div className="completed-icon">✅</div>
                    <div className="completed-info">
                      <h4>Job Completed</h4>
                      <p>You Earned: {formatCurrency(getCleanerAmount(job.paymentAmount))}</p>
                      <p>Points Earned: ⭐ +{getCleanerPoints(job.paymentAmount)}</p>
                      <p>Completed: {new Date(job.completedAt || job.verifiedAt || job.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="rating-display">
                      {job.rating && job.rating > 0 ? (
                        <div className="rating-stars">{renderStars(job.rating)}</div>
                      ) : (
                        <button onClick={() => { setSelectedCompletedJob(job); setShowRatingModal(true); }} className="btn-rate">
                          Rate This Job
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

      {/* Rejected Jobs */}
      {activeTab === 'rejected' && (
        <div className="section">
          <div className="section-header">
            <h2>❌ Jobs Rejected by Reporters</h2>
            <p>These jobs were rejected during verification. Below are the reasons provided by reporters.</p>
          </div>
          
          {rejectedJobs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">✓</div>
              <h3>No rejected jobs</h3>
              <p>All your submitted jobs have been approved!</p>
            </div>
          ) : (
            <div className="rejected-jobs-list">
              {rejectedJobs.map((job, index) => (
                <div key={job._id} className="rejected-job-card">
                  <div className="rejected-job-header">
                    <div className="rejected-icon">❌</div>
                    <div className="rejected-job-info">
                      <h4>Job #{index + 1} - Rejected by Reporter</h4>
                      <p className="rejected-reward">💰 You Would Have Earned: {formatCurrency(getCleanerAmount(job.paymentAmount))}</p>
                      <p className="rejected-points">⭐ You Would Have Earned: {getCleanerPoints(job.paymentAmount)} points</p>
                      <p className="rejected-date">📅 Rejected on: {new Date(job.rejectedAt || job.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  
                  <div className="rejected-images">
                    <div className="before-image">
                      <img src={job.imageUrl} alt="Before cleaning" />
                      <span>📸 Before Cleaning</span>
                    </div>
                    {job.afterImage && (
                      <div className="after-image">
                        <img src={job.afterImage} alt="After cleaning" />
                        <span>📸 After Cleaning</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="rejected-details">
                    <p><strong>📍 Location:</strong> {job.location?.address}</p>
                    <p><strong>📝 Description:</strong> {job.description}</p>
                    <p><strong>👤 Reported by:</strong> {job.user?.name || 'Unknown'} ({job.user?.email})</p>
                    <p><strong>🗑️ Waste Type:</strong> {job.wasteType}</p>
                    <p><strong>⚠️ Severity:</strong> <span className={`severity-${job.severity}`}>{job.severity}</span></p>
                  </div>
                  
                  <div className="rejection-reason-box">
                    <div className="rejection-reason-header">
                      <span className="reason-icon">💬</span>
                      <strong>Rejection Reason from Reporter:</strong>
                    </div>
                    <p className="rejection-reason-text">
                      "{job.verificationComment || job.rejectionReason || 'No specific reason provided by reporter'}"
                    </p>
                    <div className="rejection-note">
                      <small>⚠️ Please ensure the area is completely clean before submitting for verification.</small>
                    </div>
                  </div>
                  
                  <div className="rejected-actions">
                    <button 
                      onClick={() => setActiveTab('available')}
                      className="btn-find-jobs"
                    >
                      🔍 Find Other Jobs
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
            <h3>Rate Your Experience</h3>
            <p>How would you rate this job?</p>
            <div className="rating-input">
              {renderStars(rating, true, setRating, setHoverRating)}
            </div>
            <textarea
              placeholder="Leave a comment (optional)"
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
        <button onClick={() => setActiveTab('available')} className="action-btn primary">
          🔍 Find More Jobs
        </button>
        <button onClick={fetchData} className="action-btn secondary">
          🔄 Refresh Data
        </button>
      </div>
    </div>
  );
};

export default CleanerDashboard;