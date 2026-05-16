import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import './ReportsList.css';

const ReportsList = () => {
  const [reports, setReports] = useState([]);
  const [activeJobs, setActiveJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [activeTab, setActiveTab] = useState('available');
  const { user } = useAuth();

  useEffect(() => {
    fetchReports();
    if (user?.role === 'cleaner') {
      fetchActiveJobs();
    }
  }, []);

  const fetchReports = async () => {
    try {
      const response = await axios.get('/waste/reports');
      if (response.data.success) {
        setReports(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveJobs = async () => {
    try {
      const response = await axios.get('/waste/jobs/my-active');
      if (response.data.success) {
        setActiveJobs(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching active jobs:', error);
    }
  };

  const handleAcceptJob = async (reportId) => {
    setActionLoading(reportId);
    try {
      const response = await axios.post(`/waste/report/${reportId}/accept`);
      if (response.data.success) {
        alert(response.data.message);
        fetchReports();
        fetchActiveJobs();
      }
    } catch (error) {
      alert('Error: ' + (error.response?.data?.message || 'Failed to accept job'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleStartJob = async (reportId) => {
    setActionLoading(reportId);
    try {
      const response = await axios.put(`/waste/report/${reportId}/start`);
      if (response.data.success) {
        alert(response.data.message);
        fetchReports();
        fetchActiveJobs();
      }
    } catch (error) {
      alert('Error: ' + (error.response?.data?.message || 'Failed to start job'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleCompleteJob = async (reportId) => {
    setActionLoading(reportId);
    try {
      const response = await axios.put(`/waste/report/${reportId}/complete`);
      if (response.data.success) {
        alert(response.data.message);
        fetchReports();
        fetchActiveJobs();
        // Update user's wallet in context
        const updatedUser = { ...user, walletBalance: response.data.walletBalance };
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
    } catch (error) {
      alert('Error: ' + (error.response?.data?.message || 'Failed to complete job'));
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { class: 'status-pending', text: '💰 Available' },
      accepted: { class: 'status-accepted', text: '✓ Accepted' },
      'in-progress': { class: 'status-progress', text: '🔄 In Progress' },
      completed: { class: 'status-completed', text: '✅ Completed' },
      cancelled: { class: 'status-cancelled', text: '❌ Cancelled' }
    };
    return badges[status] || badges.pending;
  };

  const getPaymentBadge = (paymentStatus) => {
    const badges = {
      pending: { class: 'payment-pending', text: '⏳ Payment Held' },
      accepted: { class: 'payment-accepted', text: '💰 Payment Reserved' },
      completed: { class: 'payment-completed', text: '✅ Payment Released' }
    };
    return badges[paymentStatus] || badges.pending;
  };

  if (loading) return <div className="loading-reports">Loading...</div>;

  return (
    <div className="reports-container">
      <div className="reports-header">
        <h2>{user?.role === 'user' ? 'My Waste Reports' : 'Waste Cleaning Jobs'}</h2>
        {user?.role === 'cleaner' && (
          <div className="wallet-badge">
            💰 Wallet: ₹{user?.walletBalance || 0}
          </div>
        )}
      </div>

      {user?.role === 'cleaner' && (
        <div className="tabs">
          <button 
            className={activeTab === 'available' ? 'tab-active' : 'tab'}
            onClick={() => setActiveTab('available')}
          >
            Available Jobs ({reports.filter(r => r.status === 'pending').length})
          </button>
          <button 
            className={activeTab === 'active' ? 'tab-active' : 'tab'}
            onClick={() => setActiveTab('active')}
          >
            My Active Jobs ({activeJobs.length})
          </button>
        </div>
      )}

      {(activeTab === 'available' ? reports : activeJobs).length === 0 ? (
        <div className="no-reports">
          <div className="no-reports-icon">🗑️</div>
          <h3>No jobs found</h3>
          <p>{user?.role === 'user' ? 'Start by reporting a waste area!' : 'No available jobs at the moment.'}</p>
        </div>
      ) : (
        <div className="reports-grid">
          {(activeTab === 'available' ? reports : activeJobs).map(report => (
            <div key={report._id} className={`report-card status-${report.status}`}>
              <div className="report-image-container">
                <img src={report.imageUrl} alt="Waste area" className="report-image" />
                <div className="report-badges">
                  <span className={getStatusBadge(report.status).class}>
                    {getStatusBadge(report.status).text}
                  </span>
                  <span className="payment-badge">
                    {getPaymentBadge(report.paymentStatus).text}
                  </span>
                </div>
              </div>
              
              <div className="report-content">
                <div className="payment-amount">
                  💰 Reward: <strong>₹{report.paymentAmount}</strong>
                </div>
                
                <p className="report-description">{report.description}</p>
                
                <div className="report-details">
                  <div className="detail-item">
                    <span className="detail-label">📍 Location:</span>
                    <span className="detail-value">{report.location?.address || `${report.location?.lat.toFixed(4)}, ${report.location?.lng.toFixed(4)}`}</span>
                  </div>
                  
                  <div className="detail-item">
                    <span className="detail-label">🗑️ Type:</span>
                    <span className="detail-value">{report.wasteType}</span>
                  </div>
                  
                  <div className="detail-item">
                    <span className="detail-label">⚠️ Severity:</span>
                    <span className={`severity-${report.severity}`}>{report.severity}</span>
                  </div>
                  
                  {report.user && (
                    <div className="detail-item">
                      <span className="detail-label">👤 Posted by:</span>
                      <span className="detail-value">{report.user.name}</span>
                    </div>
                  )}
                  
                  {report.acceptedBy && (
                    <div className="detail-item">
                      <span className="detail-label">🧹 Accepted by:</span>
                      <span className="detail-value">{report.acceptedBy.name}</span>
                    </div>
                  )}
                </div>
                
                {user?.role === 'cleaner' && activeTab === 'available' && report.status === 'pending' && (
                  <button 
                    onClick={() => handleAcceptJob(report._id)} 
                    className="btn-accept"
                    disabled={actionLoading === report._id}
                  >
                    {actionLoading === report._id ? 'Processing...' : `Accept Job (₹${report.paymentAmount})`}
                  </button>
                )}
                
                {user?.role === 'cleaner' && activeTab === 'active' && report.status === 'accepted' && (
                  <button 
                    onClick={() => handleStartJob(report._id)} 
                    className="btn-start-job"
                    disabled={actionLoading === report._id}
                  >
                    {actionLoading === report._id ? 'Starting...' : 'Start Cleaning'}
                  </button>
                )}
                
                {user?.role === 'cleaner' && activeTab === 'active' && report.status === 'in-progress' && (
                  <button 
                    onClick={() => handleCompleteJob(report._id)} 
                    className="btn-complete"
                    disabled={actionLoading === report._id}
                  >
                    {actionLoading === report._id ? 'Completing...' : `Complete & Earn ₹${report.paymentAmount}`}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};


export default ReportsList;