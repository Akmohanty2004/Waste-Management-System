import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import './AnalyticsCharts.css';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler
);

const AnalyticsCharts = ({ stats, monthlyStats, recentTransactions }) => {
  // Calculate actual commission distribution values
  const calculateDistribution = () => {
    let totalAdminCommission = 0;
    let totalCleanerCash = 0;
    let totalUserPoints = 0;
    let totalCleanerPoints = 0;
    let totalPayments = 0;

    if (recentTransactions && recentTransactions.length > 0) {
      recentTransactions.forEach(transaction => {
        const paymentAmount = transaction.paymentAmount;
        totalAdminCommission += (paymentAmount * 8) / 100;
        totalCleanerCash += (paymentAmount * 90) / 100;
        totalUserPoints += (paymentAmount * 1) / 100;
        totalCleanerPoints += (paymentAmount * 1) / 100;
        totalPayments += paymentAmount;
      });
    } else if (stats?.totalPayments) {
      totalPayments = stats.totalPayments;
      totalAdminCommission = (totalPayments * 8) / 100;
      totalCleanerCash = (totalPayments * 90) / 100;
      totalUserPoints = (totalPayments * 1) / 100;
      totalCleanerPoints = (totalPayments * 1) / 100;
    }

    return {
      totalAdminCommission,
      totalCleanerCash,
      totalUserPoints,
      totalCleanerPoints,
      totalPayments
    };
  };

  const distribution = calculateDistribution();

  // Generate daily transaction data from recent transactions
  const getDailyTransactionData = () => {
    const last7Days = [];
    const dailyTotals = new Array(7).fill(0);
    const dailyCounts = new Array(7).fill(0);
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      last7Days.push(date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }));
    }
    
    if (recentTransactions && recentTransactions.length > 0) {
      recentTransactions.forEach(transaction => {
        const transactionDate = new Date(transaction.completedAt);
        const today = new Date();
        const diffDays = Math.floor((today - transactionDate) / (1000 * 60 * 60 * 24));
        
        if (diffDays >= 0 && diffDays < 7) {
          const index = 6 - diffDays;
          dailyTotals[index] += transaction.paymentAmount;
          dailyCounts[index] += 1;
        }
      });
    }
    
    return { labels: last7Days, totals: dailyTotals, counts: dailyCounts };
  };

  // Generate weekly trend data
  const getWeeklyTrendData = () => {
    const weeks = [];
    const weeklyTotals = [];
    const weeklyCounts = [];
    
    if (monthlyStats && monthlyStats.length > 0) {
      monthlyStats.slice(0, 4).forEach((month, index) => {
        const weekCount = Math.ceil(month.totalJobs / 4) || 1;
        weeks.push(`${new Date(month._id.year, month._id.month - 1).toLocaleString('default', { month: 'short' })} Week ${index + 1}`);
        weeklyTotals.push(month.totalAmount / weekCount);
        weeklyCounts.push(month.totalJobs / weekCount);
      });
    }
    
    return { labels: weeks, totals: weeklyTotals, counts: weeklyCounts };
  };

  const dailyData = getDailyTransactionData();
  const weeklyData = getWeeklyTrendData();

  // Daily Transaction Amount Line Chart
  const dailyTransactionData = {
    labels: dailyData.labels,
    datasets: [
      {
        label: 'Transaction Amount (₹)',
        data: dailyData.totals,
        backgroundColor: 'rgba(76, 175, 80, 0.2)',
        borderColor: '#4caf50',
        borderWidth: 3,
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#4caf50',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointStyle: 'circle',
      }
    ]
  };

  // Daily Transaction Count Line Chart
  const dailyTransactionCountData = {
    labels: dailyData.labels,
    datasets: [
      {
        label: 'Number of Transactions',
        data: dailyData.counts,
        backgroundColor: 'rgba(33, 150, 243, 0.2)',
        borderColor: '#2196f3',
        borderWidth: 3,
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#2196f3',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointStyle: 'circle',
      }
    ]
  };

  // Weekly Revenue Trend
  const weeklyRevenueData = {
    labels: weeklyData.labels,
    datasets: [
      {
        label: 'Weekly Revenue (₹)',
        data: weeklyData.totals,
        backgroundColor: 'rgba(255, 152, 0, 0.2)',
        borderColor: '#ff9800',
        borderWidth: 3,
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#ff9800',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointStyle: 'circle',
      }
    ]
  };

  // Cumulative Revenue Growth Chart
  const getCumulativeRevenueData = () => {
    let cumulativeTotal = 0;
    const cumulativeData = [];
    
    if (recentTransactions && recentTransactions.length > 0) {
      [...recentTransactions].reverse().forEach(transaction => {
        cumulativeTotal += transaction.paymentAmount;
        cumulativeData.push(cumulativeTotal);
      });
    }
    
    return {
      labels: recentTransactions?.map((_, index) => `Txn ${index + 1}`).reverse() || [],
      data: cumulativeData
    };
  };
  
  const cumulativeData = getCumulativeRevenueData();
  
  const cumulativeRevenueData = {
    labels: cumulativeData.labels,
    datasets: [
      {
        label: 'Cumulative Revenue (₹)',
        data: cumulativeData.data,
        backgroundColor: 'rgba(156, 39, 176, 0.2)',
        borderColor: '#9c27b0',
        borderWidth: 3,
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#9c27b0',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointStyle: 'circle',
      }
    ]
  };

  // Commission Distribution Pie Chart Data
  const commissionDistributionData = {
    labels: ['Admin Commission (8%)', 'Cleaner Cash (90%)', 'User Points (1%)', 'Cleaner Points (1%)'],
    datasets: [
      {
        data: [
          distribution.totalAdminCommission,
          distribution.totalCleanerCash,
          distribution.totalUserPoints,
          distribution.totalCleanerPoints
        ],
        backgroundColor: ['#667eea', '#4caf50', '#ff9800', '#9c27b0'],
        borderColor: ['#5a67d8', '#45a049', '#f57c00', '#7b1fa2'],
        borderWidth: 2,
      }
    ]
  };

  // Commission Trend Chart Data (Monthly)
  const commissionTrendData = {
    labels: monthlyStats?.map(month => 
      `${new Date(month._id.year, month._id.month - 1).toLocaleString('default', { month: 'short' })} ${month._id.year}`
    ).reverse() || [],
    datasets: [
      {
        label: 'Admin Commission (8%)',
        data: monthlyStats?.map(month => (month.totalAmount * 8) / 100).reverse() || [],
        backgroundColor: 'rgba(102, 126, 234, 0.2)',
        borderColor: '#667eea',
        borderWidth: 3,
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#667eea',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
      },
      {
        label: 'Cleaner Cash (90%)',
        data: monthlyStats?.map(month => (month.totalAmount * 90) / 100).reverse() || [],
        backgroundColor: 'rgba(76, 175, 80, 0.2)',
        borderColor: '#4caf50',
        borderWidth: 3,
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#4caf50',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
      }
    ]
  };

  // Jobs Trend Chart Data
  const jobsTrendData = {
    labels: monthlyStats?.map(month => 
      `${new Date(month._id.year, month._id.month - 1).toLocaleString('default', { month: 'short' })} ${month._id.year}`
    ).reverse() || [],
    datasets: [
      {
        label: 'Completed Jobs',
        data: monthlyStats?.map(month => month.totalJobs).reverse() || [],
        backgroundColor: 'rgba(255, 152, 0, 0.2)',
        borderColor: '#ff9800',
        borderWidth: 3,
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#ff9800',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
      }
    ]
  };

  // Waste Type Distribution Chart - FIXED with sample data
  const getWasteTypeData = () => {
    // Default sample data for waste types
    let wasteData = {
      plastic: 0,
      organic: 0,
      electronic: 0,
      hazardous: 0,
      mixed: 0,
      other: 0
    };
    
    // If we have reports data from stats, use it
    if (stats?.reportsByType && Array.isArray(stats.reportsByType) && stats.reportsByType.length > 0) {
      stats.reportsByType.forEach(item => {
        if (item && item._id && wasteData.hasOwnProperty(item._id)) {
          wasteData[item._id] = item.count || 0;
        }
      });
    } else if (stats?.reportsByType && typeof stats.reportsByType === 'object') {
      // Handle object format
      Object.keys(stats.reportsByType).forEach(key => {
        if (wasteData.hasOwnProperty(key)) {
          wasteData[key] = stats.reportsByType[key] || 0;
        }
      });
    }
    
    // If no data, use sample data for demo
    // Only show real data (no sample data fallback)
    
    return {
      labels: ['Plastic', 'Organic', 'Electronic', 'Hazardous', 'Mixed', 'Other'],
      datasets: [{
        data: [
          wasteData.plastic,
          wasteData.organic,
          wasteData.electronic,
          wasteData.hazardous,
          wasteData.mixed,
          wasteData.other
        ],
        backgroundColor: ['#667eea', '#4caf50', '#ff9800', '#f44336', '#9c27b0', '#00bcd4'],
        borderColor: ['#5a67d8', '#45a049', '#f57c00', '#d32f2f', '#7b1fa2', '#0097a7'],
        borderWidth: 2,
      }]
    };
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          font: { size: 11, weight: 'bold' },
          usePointStyle: true,
          boxWidth: 10,
          color: '#c8e6c9'
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0,0,0,0.8)',
        padding: 10,
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) label += ': ';
            if (context.parsed.y !== undefined) {
              label += '₹' + context.parsed.y.toLocaleString();
            }
            return label;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(255,255,255,0.05)' },
        ticks: { 
          callback: function(value) { return '₹' + value.toLocaleString(); },
          color: '#a5d6a7'
        }
      },
      x: {
        grid: { display: false },
        ticks: { color: '#a5d6a7' }
      }
    }
  };

  const countLineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          font: { size: 11, weight: 'bold' },
          usePointStyle: true,
          boxWidth: 10,
          color: '#c8e6c9'
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0,0,0,0.8)',
        padding: 10,
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) label += ': ';
            label += context.parsed.y + ' transactions';
            return label;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(255,255,255,0.05)' },
        ticks: { 
          stepSize: 1,
          color: '#a5d6a7'
        }
      },
      x: {
        grid: { display: false },
        ticks: { color: '#a5d6a7' }
      }
    }
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          font: { size: 10 },
          usePointStyle: true,
          padding: 10,
          color: '#c8e6c9'
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.raw || 0;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
            return `${label}: ${value} reports (${percentage}%)`;
          }
        }
      }
    }
  };

  const wasteTypeData = getWasteTypeData();
  const totalWasteReports = wasteTypeData.datasets[0].data.reduce((a, b) => a + b, 0);

  return (
    <div className="analytics-container">
      {/* AI Insight Card */}
      <div className="ai-insights">
        <div className="insight-card">
          <div className="insight-icon">🤖</div>
          <div className="insight-content">
            <h4>AI Platform Insight</h4>
            <p>
              {stats?.totalJobs > 0 
                ? `📈 Platform has generated ₹${(distribution.totalAdminCommission).toLocaleString()} in commission from ${stats.totalJobs} completed jobs. Average commission per job: ₹${(distribution.totalAdminCommission / stats.totalJobs).toLocaleString()}. Daily transactions are trending ${dailyData.totals[dailyData.totals.length - 1] > dailyData.totals[0] ? 'upward 📈' : 'downward 📉'}.`
                : `🌱 Platform is in early stage. Complete more jobs to see growth!`}
            </p>
          </div>
        </div>
      </div>

      {/* Money Transaction Line Charts Section */}
      <div className="section-header">
        <h3>💰 Money Transaction Analytics</h3>
        <p>Track daily and weekly transaction trends</p>
      </div>

      <div className="charts-grid">
        {/* Daily Transaction Amount Line Chart */}
        <div className="chart-card">
          <div className="chart-header">
            <h3>📅 Daily Transaction Amount</h3>
            <p>Last 7 days transaction volume (₹)</p>
          </div>
          <div className="chart-container">
            <Line data={dailyTransactionData} options={lineOptions} />
          </div>
          <div className="chart-stats">
            <div className="stat-item">
              <span className="stat-label">Total (7 days)</span>
              <span className="stat-value">₹{dailyData.totals.reduce((a, b) => a + b, 0).toLocaleString()}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Daily Average</span>
              <span className="stat-value">₹{(dailyData.totals.reduce((a, b) => a + b, 0) / 7).toLocaleString()}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Highest Day</span>
              <span className="stat-value">₹{Math.max(...dailyData.totals).toLocaleString()}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Peak Day</span>
              <span className="stat-value">{dailyData.labels[dailyData.totals.indexOf(Math.max(...dailyData.totals))]}</span>
            </div>
          </div>
        </div>

        {/* Daily Transaction Count Line Chart */}
        <div className="chart-card">
          <div className="chart-header">
            <h3>📊 Daily Transaction Count</h3>
            <p>Number of transactions per day</p>
          </div>
          <div className="chart-container">
            <Line data={dailyTransactionCountData} options={countLineOptions} />
          </div>
          <div className="chart-stats">
            <div className="stat-item">
              <span className="stat-label">Total Transactions</span>
              <span className="stat-value">{dailyData.counts.reduce((a, b) => a + b, 0)}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Avg Daily</span>
              <span className="stat-value">{(dailyData.counts.reduce((a, b) => a + b, 0) / 7).toFixed(1)}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Busiest Day</span>
              <span className="stat-value">{Math.max(...dailyData.counts)} transactions</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Peak Day</span>
              <span className="stat-value">{dailyData.labels[dailyData.counts.indexOf(Math.max(...dailyData.counts))]}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="charts-grid">
        {/* Weekly Revenue Trend */}
        <div className="chart-card">
          <div className="chart-header">
            <h3>📈 Weekly Revenue Trend</h3>
            <p>Estimated weekly revenue based on monthly data</p>
          </div>
          <div className="chart-container">
            <Line data={weeklyRevenueData} options={lineOptions} />
          </div>
          <div className="chart-stats">
            <div className="stat-item">
              <span className="stat-label">Projected Weekly Avg</span>
              <span className="stat-value">₹{(weeklyData.totals.reduce((a, b) => a + b, 0) / (weeklyData.totals.length || 1)).toLocaleString()}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Growth Trend</span>
              <span className="stat-value">
                {weeklyData.totals.length > 1 && weeklyData.totals[weeklyData.totals.length - 1] > weeklyData.totals[0] ? '📈 Upward' : '📉 Downward'}
              </span>
            </div>
          </div>
        </div>

        {/* Cumulative Revenue Growth */}
        <div className="chart-card">
          <div className="chart-header">
            <h3>📈 Cumulative Revenue Growth</h3>
            <p>Running total of platform revenue over time</p>
          </div>
          <div className="chart-container">
            <Line data={cumulativeRevenueData} options={lineOptions} />
          </div>
          <div className="chart-stats">
            <div className="stat-item">
              <span className="stat-label">Total Revenue</span>
              <span className="stat-value">₹{cumulativeData.data[cumulativeData.data.length - 1]?.toLocaleString() || 0}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Growth Rate</span>
              <span className="stat-value">
                {cumulativeData.data.length > 1 
                  ? `+${((cumulativeData.data[cumulativeData.data.length - 1] - cumulativeData.data[0]) / (cumulativeData.data[0] || 1) * 100).toFixed(1)}%`
                  : '0%'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Commission & Jobs Trend Section */}
      <div className="section-header">
        <h3>📊 Commission & Performance Analytics</h3>
        <p>Monthly trends and distribution analysis</p>
      </div>

      <div className="charts-grid">
        {/* Commission Trend Chart */}
        <div className="chart-card">
          <div className="chart-header">
            <h3>📈 Commission & Revenue Trend</h3>
            <p>Monthly commission (8%) and cleaner earnings (90%)</p>
          </div>
          <div className="chart-container">
            <Line data={commissionTrendData} options={lineOptions} />
          </div>
        </div>

        {/* Jobs Trend Chart */}
        <div className="chart-card">
          <div className="chart-header">
            <h3>📊 Jobs Completed Trend</h3>
            <p>Monthly job completion statistics</p>
          </div>
          <div className="chart-container">
            <Line data={jobsTrendData} options={lineOptions} />
          </div>
        </div>

        {/* Commission Distribution Pie Chart */}
        <div className="chart-card">
          <div className="chart-header">
            <h3>💰 Commission Distribution</h3>
            <p>Platform vs Cleaner earnings breakdown (8% | 90% | 1% | 1%)</p>
          </div>
          <div className="chart-container doughnut">
            <Doughnut data={commissionDistributionData} options={doughnutOptions} />
          </div>
          <div className="chart-stats">
            <div className="stat-item">
              <span className="stat-label">Admin Commission (8%):</span>
              <span className="stat-value">₹{distribution.totalAdminCommission.toLocaleString()}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Cleaner Cash (90%):</span>
              <span className="stat-value">₹{distribution.totalCleanerCash.toLocaleString()}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">User Points (1%):</span>
              <span className="stat-value">{Math.floor(distribution.totalUserPoints)} pts</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Cleaner Points (1%):</span>
              <span className="stat-value">{Math.floor(distribution.totalCleanerPoints)} pts</span>
            </div>
          </div>
        </div>

        {/* Waste Type Distribution - FIXED */}
        <div className="chart-card">
          <div className="chart-header">
            <h3>🗑️ Waste Type Distribution</h3>
            <p>Most common waste types reported</p>
          </div>
          <div className="chart-container doughnut">
            {totalWasteReports > 0 ? (
              <Doughnut data={wasteTypeData} options={doughnutOptions} />
            ) : (
              <div className="no-data-message">No waste type data available</div>
            )}
          </div>
          <div className="chart-stats">
            <div className="stat-item">
              <span className="stat-label">Total Reports</span>
              <span className="stat-value">{totalWasteReports}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Top Type</span>
              <span className="stat-value">
                {wasteTypeData.labels[wasteTypeData.datasets[0].data.indexOf(Math.max(...wasteTypeData.datasets[0].data))]}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Most Common</span>
              <span className="stat-value">{Math.max(...wasteTypeData.datasets[0].data)} reports</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Categories</span>
              <span className="stat-value">6 types</span>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="performance-metrics">
        <h3>🎯 Performance Metrics</h3>
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-icon">📈</div>
            <div className="metric-info">
              <h4>Average Commission per Job</h4>
              <p className="metric-value">₹{(distribution.totalAdminCommission / (stats?.totalJobs || 1)).toLocaleString()}</p>
              <small>Per completed job</small>
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-icon">💰</div>
            <div className="metric-info">
              <h4>Total Platform Revenue</h4>
              <p className="metric-value">₹{distribution.totalAdminCommission.toLocaleString()}</p>
              <small>From all completed jobs</small>
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-icon">🎯</div>
            <div className="metric-info">
              <h4>Commission Rate</h4>
              <p className="metric-value">8%</p>
              <small>Platform fee + 2% points</small>
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-icon">⭐</div>
            <div className="metric-info">
              <h4>Total Points Distributed</h4>
              <p className="metric-value">{Math.floor(distribution.totalUserPoints + distribution.totalCleanerPoints)} pts</p>
              <small>To users and cleaners</small>
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-icon">📊</div>
            <div className="metric-info">
              <h4>Daily Transaction Avg</h4>
              <p className="metric-value">₹{(dailyData.totals.reduce((a, b) => a + b, 0) / 7).toLocaleString()}</p>
              <small>Last 7 days</small>
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-icon">📅</div>
            <div className="metric-info">
              <h4>Peak Transaction Day</h4>
              <p className="metric-value">{dailyData.labels[dailyData.totals.indexOf(Math.max(...dailyData.totals))]}</p>
              <small>Highest volume day</small>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsCharts;