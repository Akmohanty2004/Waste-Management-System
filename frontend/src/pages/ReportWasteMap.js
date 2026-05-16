import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { GoogleMapsProvider } from '../contexts/GoogleMapsContext';
import LocationSearch from '../components/LocationSearch';
import Map from '../components/Map';
import './ReportWaste.css';

const ReportWasteForm = () => {
  const [description, setDescription] = useState('');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [location, setLocation] = useState(null);
  const [wasteType, setWasteType] = useState('mixed');
  const [severity, setSeverity] = useState('medium');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setMessage('Image size should be less than 5MB');
        return;
      }
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLocationSelect = (locationData) => {
    setLocation(locationData);
    setMessage('Location selected successfully!');
    setTimeout(() => setMessage(''), 3000);
  };

  const handleMapLocationClick = (mapLocation) => {
    // Reverse geocode to get address
    fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${mapLocation.lat},${mapLocation.lng}&key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}`
    )
      .then(res => res.json())
      .then(data => {
        const address = data.results[0]?.formatted_address || `${mapLocation.lat}, ${mapLocation.lng}`;
        setLocation({
          ...mapLocation,
          address
        });
        setMessage('Location selected from map!');
        setTimeout(() => setMessage(''), 3000);
      })
      .catch(error => {
        console.error('Error getting address:', error);
        setLocation({
          ...mapLocation,
          address: `${mapLocation.lat}, ${mapLocation.lng}`
        });
      });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!location) {
      setMessage('Please select a location on the map or search for a location');
      return;
    }
    
    if (!imagePreview) {
      setMessage('Please take a photo of the waste area');
      return;
    }
    
    if (!description.trim()) {
      setMessage('Please provide a description');
      return;
    }
    
    if (!paymentAmount || paymentAmount < 10 || paymentAmount > 10000) {
      setMessage('Please set a payment amount between ₹10 and ₹10,000');
      return;
    }
    
    if (paymentAmount > user.walletBalance) {
      setMessage(`Insufficient balance! Your wallet balance is ₹${user.walletBalance}. Please add funds first.`);
      return;
    }
    
    setLoading(true);
    
    try {
      const reportData = {
        imageUrl: imagePreview,
        location: {
          lat: location.lat,
          lng: location.lng,
          address: location.address
        },
        description: description.trim(),
        wasteType,
        severity,
        paymentAmount: Number(paymentAmount)
      };
      
      const response = await axios.post('/waste/report', reportData);
      
      if (response.data.success) {
        setMessage(`✅ Report submitted! ₹${paymentAmount} has been held from your wallet.`);
        const updatedUser = { ...user, walletBalance: response.data.walletBalance };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        setTimeout(() => {
          navigate('/reports');
        }, 3000);
      }
    } catch (error) {
      setMessage('Error: ' + (error.response?.data?.message || 'Failed to submit report'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="report-container">
      <h2>Report Waste Area</h2>
      <p className="report-subtitle">Set a reward amount for cleaning this waste</p>
      
      <div className="wallet-info">
        💰 Your Wallet Balance: <strong>₹{user?.walletBalance || 0}</strong>
      </div>
      
      {message && <div className={`message ${message.includes('✅') ? 'success' : 'error'}`}>{message}</div>}
      
      <form onSubmit={handleSubmit} className="report-form">
        <div className="form-row">
          <div className="form-section">
            <label>📸 Take Photo</label>
            <div className="image-upload-area">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                ref={fileInputRef}
                style={{ display: 'none' }}
              />
              {!imagePreview ? (
                <button 
                  type="button" 
                  onClick={() => fileInputRef.current.click()}
                  className="upload-btn"
                >
                  📷 Click to take photo
                </button>
              ) : (
                <div className="image-preview-container">
                  <img src={imagePreview} alt="Preview" className="image-preview" />
                  <button 
                    type="button" 
                    onClick={() => {
                      setImage(null);
                      setImagePreview('');
                    }}
                    className="remove-image"
                  >
                    ✖ Remove
                  </button>
                </div>
              )}
            </div>
          </div>
          
          <div className="form-section">
            <label>💰 Reward Amount (₹)</label>
            <input
              type="number"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              placeholder="Enter amount to pay for cleaning"
              min="10"
              max="10000"
              step="10"
              required
            />
            <small>This amount will be deducted from your wallet and paid to the cleaner upon completion</small>
          </div>
        </div>
        
        <div className="form-section">
          <label>📍 Location</label>
          <LocationSearch 
            onLocationSelect={handleLocationSelect}
            placeholder="Search for a location..."
          />
        </div>
        
        <div className="form-section">
          <label>🗺️ Click on Map to Select Location</label>
          <div className="map-wrapper">
            <Map 
              reports={[]}
              onLocationClick={handleMapLocationClick}
              selectedReport={null}
            />
          </div>
          {location && (
            <div className="location-confirmation">
              ✅ Location selected: {location.address}
            </div>
          )}
        </div>
        
        <div className="form-row">
          <div className="form-section">
            <label>🗑️ Waste Type</label>
            <select value={wasteType} onChange={(e) => setWasteType(e.target.value)}>
              <option value="plastic">Plastic Waste</option>
              <option value="organic">Organic Waste</option>
              <option value="electronic">Electronic Waste</option>
              <option value="hazardous">Hazardous Waste</option>
              <option value="mixed">Mixed Waste</option>
              <option value="other">Other</option>
            </select>
          </div>
          
          <div className="form-section">
            <label>⚠️ Severity Level</label>
            <select value={severity} onChange={(e) => setSeverity(e.target.value)}>
              <option value="low">Low - Small amount</option>
              <option value="medium">Medium - Moderate amount</option>
              <option value="high">High - Large amount</option>
              <option value="critical">Critical - Emergency</option>
            </select>
          </div>
        </div>
        
        <div className="form-section">
          <label>📝 Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the waste area (size, type, exact location, etc.)"
            rows="4"
            maxLength="500"
            required
          />
          <div className="char-count">{description.length}/500</div>
        </div>
        
        <button type="submit" disabled={loading} className="submit-btn">
          {loading ? 'Submitting...' : `Report Waste (₹${paymentAmount || 0} Reward)`}
        </button>
      </form>
    </div>
  );
};

const ReportWaste = () => {
  return (
    <GoogleMapsProvider>
      <ReportWasteForm />
    </GoogleMapsProvider>
  );
};

export default ReportWaste;