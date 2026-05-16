import React, { useState } from 'react';
import axios from 'axios';
import './PointsRedeem.css';

const PointsRedeem = ({ user, onRedeem }) => {
  const [pointsToRedeem, setPointsToRedeem] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRedeem = async () => {
    if (!pointsToRedeem || pointsToRedeem <= 0) {
      setMessage('Please enter a valid number of points');
      setMessageType('error');
      return;
    }

    if (pointsToRedeem > user.points) {
      setMessage(`You only have ${user.points} points available`);
      setMessageType('error');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('/waste/redeem-points', {
        points: Number(pointsToRedeem)
      });

      if (response.data.success) {
        setMessage(response.data.message);
        setMessageType('success');
        setPointsToRedeem('');
        if (onRedeem) {
          onRedeem(response.data.walletBalance, response.data.points);
        }
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to redeem points');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="points-redeem-card">
      <div className="points-info">
        <div className="points-icon">⭐</div>
        <div className="points-details">
          <h4>Your Points</h4>
          <p className="points-amount">{user?.points || 0} points</p>
          <p className="points-value">1 point = ₹1</p>
        </div>
      </div>
      
      <div className="redeem-section">
        <input
          type="number"
          placeholder="Enter points to redeem"
          value={pointsToRedeem}
          onChange={(e) => setPointsToRedeem(e.target.value)}
          min="10"
          step="10"
        />
        <button onClick={handleRedeem} disabled={loading}>
          {loading ? 'Processing...' : 'Redeem to Wallet'}
        </button>
      </div>
      
      {message && (
        <div className={`redeem-message ${messageType}`}>
          {message}
        </div>
      )}
    </div>
  );
};

export default PointsRedeem;