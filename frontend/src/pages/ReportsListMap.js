import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { GoogleMapsProvider, useGoogleMaps } from '../contexts/GoogleMapsContext';
import Map from '../components/Map';
import './ReportsList.css';

const ReportsListContent = () => {
  const [reports, setReports] = useState([]);
  const [activeJobs, setActiveJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [activeTab, setActiveTab] = useState('available');
  const [selectedReport, setSelectedReport] = useState(null);
  const [viewMode, setViewMode] = useState('list');
  const [error, setError] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    console.log('ReportsList mounted. User role:', user?.role);
    fetchReports();
    if (user?.role === 'cleaner') {
      fetchActiveJobs();
    }
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching reports...');
      const response = await axios.get('/waste/reports');
      console.log('Reports API response:', response.data);
      
      if (response.data.success) {
        console.log(`Found ${response.data.data.length} reports`);
        setReports(response.data.data);
      } else {
        setError(response.data.message);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
      setError(error.response?.data?.message || 'Failed to fetch reports');
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
        // Update user's wallet
        const updatedUser = { ...user, walletBalance: response.data.walletBalance };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        // Force refresh to update UI
        window.location.reload();
      }
    } catch (error) {
      alert('Error: ' + (error.response?.data?.message || 'Failed to complete job'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkerClick = (report) => {
    setSelectedReport(report);
  };

  const currentData = activeTab === 'available' ? reports : activeJobs;

  if (loading) return <div className="loading-reports">Loading reports...</div>;

  if (error) {
    return (
      <div className="error-container">
        <h3>Error loading reports</h3>
        <p>{error}</p>
        <button onClick={fetchReports}>Try Again</button>
      </div>
    );
  }

  return (
    <div className="reports-container">
      <div className="reports-header">
        <h2>{user?.role === 'user' ? 'My Waste Reports' : 'Waste Cleaning Jobs'}</h2>
        {user?.role === 'cleaner' && (
          <div className="wallet-badge">
            💰 Wallet: ₹{user?.walletBalance || 0}
          </div>
        )}
        <div className="view-toggle">
          <button 
            className={viewMode === 'list' ? 'active' : ''}
            onClick={() => setViewMode('list')}
          >
            📋 List View ({currentData.length})
          </button>
          <button 
            className={viewMode === 'map' ? 'active' : ''}
            onClick={() => setViewMode('map')}
          >
            🗺️ Map View ({currentData.length})
          </button>
        </div>
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

      {viewMode === 'map' && currentData.length > 0 && (
        <div className="map-view">
          <Map 
            reports={currentData}
            onMarkerClick={handleMarkerClick}
            selectedReport={selectedReport}
          />
          {selectedReport && (
            <div className="selected-report-details">
              <h3>Selected Report</h3>
              <p><strong>Description:</strong> {selectedReport.description}</p>
              <p><strong>Reward:</strong> ₹{selectedReport.paymentAmount}</p>
              <p><strong>Status:</strong> {selectedReport.status}</p>
              {user?.role === 'cleaner' && selectedReport.status === 'pending' && (
                <button 
                  onClick={() => handleAcceptJob(selectedReport._id)}
                  className="btn-accept"
                  disabled={actionLoading === selectedReport._id}
                >
                  Accept Job
                </button>
              )}
              {user?.role === 'cleaner' && selectedReport.status === 'accepted' && (
                <button 
                  onClick={() => handleCompleteJob(selectedReport._id)}
                  className="btn-complete"
                  disabled={actionLoading === selectedReport._id}
                >
                  Complete & Earn ₹{selectedReport.paymentAmount}
                </button>
              )}
              {user?.role === 'cleaner' && selectedReport.status === 'in-progress' && (
                <button 
                  onClick={() => handleCompleteJob(selectedReport._id)}
                  className="btn-complete"
                  disabled={actionLoading === selectedReport._id}
                >
                  Complete & Earn ₹{selectedReport.paymentAmount}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {viewMode === 'list' && (
        <>
          {currentData.length === 0 ? (
            <div className="no-reports">
              <div className="no-reports-icon">🗑️</div>
              <h3>No jobs found</h3>
              <p>
                {user?.role === 'user' 
                  ? 'Start by reporting a waste area!' 
                  : 'No pending waste reports available. Check back later.'}
              </p>
              {user?.role === 'cleaner' && (
                <div className="debug-info">
                  <h4>Debug Information:</h4>
                  <p>Available jobs in system: {reports.length}</p>
                  <button onClick={fetchReports} className="refresh-btn">
                    🔄 Refresh
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="reports-grid">
              {currentData.map(report => (
                <div key={report._id} className={`report-card status-${report.status}`}>
                  <div className="report-image-container">
                    <img src={report.imageUrl} alt="Waste area" className="report-image" />
                    <div className="report-badges">
                      <span className={`status-${report.status}`}>
                        {report.status === 'pending' ? '💰 Available' : 
                         report.status === 'accepted' ? '✓ Accepted' :
                         report.status === 'in-progress' ? '🔄 In Progress' :
                         report.status === 'completed' ? '✅ Completed' : report.status}
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
                      
                      <div className="detail-item">
                        <span className="detail-label">👤 Reported by:</span>
                        <span className="detail-value">{report.user?.name || 'Unknown'}</span>
                      </div>
                    </div>
                    
                    {/* Show appropriate buttons based on status */}
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
                        onClick={() => handleCompleteJob(report._id)} 
                        className="btn-complete"
                        disabled={actionLoading === report._id}
                      >
                        {actionLoading === report._id ? 'Completing...' : `Complete & Earn ₹${report.paymentAmount}`}
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
        </>
      )}
    </div>
  );
};

const ReportsList = () => {
  return (
    <GoogleMapsProvider>
      <ReportsListContent />
    </GoogleMapsProvider>
  );
};

export default ReportsList;