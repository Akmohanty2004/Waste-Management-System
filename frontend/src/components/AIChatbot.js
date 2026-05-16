import React, { useState, useRef, useEffect } from 'react';
import './AIChatbot.css';

const AIChatbot = ({ stats, users, cleaners, reports }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      text: '👋 Hello! I\'m your AI Assistant. I can help you with:\n\n📊 Platform Statistics\n👥 User Information\n💰 Commission Details\n📝 Report Analysis\n\nWhat would you like to know?'
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Get platform statistics
  const getPlatformStats = () => {
    const totalUsers = users?.length || 0;
    const totalCleaners = cleaners?.length || 0;
    const totalReports = reports?.length || 0;
    const totalJobs = stats?.totalJobs || 0;
    const totalCommission = stats?.totalCommission || 0;
    const avgCommission = stats?.averageCommission || 0;
    const totalPayments = stats?.totalPayments || 0;
    
    // Calculate additional stats
    const completedJobs = reports?.filter(r => r.status === 'completed').length || 0;
    const pendingJobs = reports?.filter(r => r.status === 'pending').length || 0;
    const rejectedJobs = reports?.filter(r => r.verificationStatus === 'rejected').length || 0;
    
    // Calculate user stats
    const totalUserSpent = users?.reduce((sum, u) => sum + (u.totalSpent || 0), 0) || 0;
    const totalCleanerEarned = cleaners?.reduce((sum, c) => sum + (c.totalEarned || 0), 0) || 0;
    const totalUserPoints = users?.reduce((sum, u) => sum + (u.points || 0), 0) || 0;
    const totalCleanerPoints = cleaners?.reduce((sum, c) => sum + (c.points || 0), 0) || 0;
    
    // Get top users
    const topUsers = [...(users || [])].sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0)).slice(0, 3);
    const topCleaners = [...(cleaners || [])].sort((a, b) => (b.completedJobs || 0) - (a.completedJobs || 0)).slice(0, 3);
    
    return {
      totalUsers,
      totalCleaners,
      totalReports,
      totalJobs,
      totalCommission,
      avgCommission,
      totalPayments,
      completedJobs,
      pendingJobs,
      rejectedJobs,
      totalUserSpent,
      totalCleanerEarned,
      totalUserPoints,
      totalCleanerPoints,
      topUsers,
      topCleaners
    };
  };

  // Generate AI response based on user query
  const generateResponse = async (userMessage) => {
    const message = userMessage.toLowerCase();
    const stats = getPlatformStats();
    
    // Welcome messages
    if (message.includes('hello') || message.includes('hi') || message.includes('hey')) {
      return `👋 Hello! Welcome to the EcoWaste Manager Admin Dashboard. I'm your AI assistant. How can I help you today?\n\nYou can ask me about:\n• Platform statistics 📊\n• User information 👥\n• Commission details 💰\n• Report analysis 📝\n• Cleaner performance 🧹`;
    }
    
    // Help message
    if (message.includes('help') || message.includes('what can you do')) {
      return `🤖 I can help you with:\n\n📊 **Platform Statistics**\n• Total users, cleaners, reports\n• Job completion rates\n• Revenue and commission\n\n👥 **User Information**\n• Top spending users\n• User activity\n• Points earned\n\n💰 **Commission Details**\n• Total commission collected\n• Average commission per job\n• Payment distribution\n\n📝 **Report Analysis**\n• Waste type distribution\n• Status breakdown\n• Recent activity\n\n🧹 **Cleaner Performance**\n• Top performing cleaners\n• Completion rates\n• Ratings\n\nJust ask me anything!`;
    }
    
    // Platform overview
    if (message.includes('overview') || message.includes('summary') || message.includes('platform status')) {
      return `📊 **Platform Overview**\n\n👥 **Users & Cleaners**\n• Total Users: ${stats.totalUsers}\n• Total Cleaners: ${stats.totalCleaners}\n\n📝 **Reports & Jobs**\n• Total Reports: ${stats.totalReports}\n• Completed Jobs: ${stats.completedJobs}\n• Pending Jobs: ${stats.pendingJobs}\n• Rejected Jobs: ${stats.rejectedJobs}\n• Completion Rate: ${stats.totalJobs > 0 ? Math.round((stats.completedJobs / stats.totalReports) * 100) : 0}%\n\n💰 **Financial**\n• Total Payment Processed: ₹${stats.totalPayments.toLocaleString()}\n• Total Commission Collected: ₹${stats.totalCommission.toLocaleString()}\n• Average Commission/Job: ₹${stats.avgCommission.toLocaleString()}\n\n⭐ **Points System**\n• User Points Earned: ${Math.floor(stats.totalUserPoints)} pts\n• Cleaner Points Earned: ${Math.floor(stats.totalCleanerPoints)} pts\n\n🎯 **Platform Health**: ${stats.completedJobs > stats.pendingJobs ? 'Good ✅' : 'Needs Attention ⚠️'}`;
    }
    
    // Total users query
    if (message.includes('total user') || message.includes('how many users')) {
      return `👥 **User Statistics**\n\n• Total Users: ${stats.totalUsers}\n• Total Cleaners: ${stats.totalCleaners}\n• Total Platform Users: ${stats.totalUsers + stats.totalCleaners}\n\n💰 **User Spending**\n• Total Spent by Users: ₹${stats.totalUserSpent.toLocaleString()}\n• Average Spend per User: ₹${(stats.totalUserSpent / (stats.totalUsers || 1)).toLocaleString()}\n\n⭐ **User Points**\n• Total Points Earned: ${Math.floor(stats.totalUserPoints)} pts\n• Average Points per User: ${Math.floor(stats.totalUserPoints / (stats.totalUsers || 1))} pts`;
    }
    
    // Top users
    if (message.includes('top user') || message.includes('highest spending')) {
      let response = `🏆 **Top Spending Users**\n\n`;
      stats.topUsers.forEach((user, index) => {
        response += `${index + 1}. **${user.name}** - ₹${(user.totalSpent || 0).toLocaleString()} spent | ${user.totalReports || 0} reports\n`;
      });
      response += `\n💡 These users are actively contributing to keeping the city clean!`;
      return response;
    }
    
    // Top cleaners
    if (message.includes('top cleaner') || message.includes('best cleaner') || message.includes('cleaner performance')) {
      let response = `🧹 **Top Performing Cleaners**\n\n`;
      stats.topCleaners.forEach((cleaner, index) => {
        response += `${index + 1}. **${cleaner.name}** - ${cleaner.completedJobs || 0} jobs | ${cleaner.rating?.toFixed(1) || 0}⭐ rating | ₹${(cleaner.totalEarned || 0).toLocaleString()} earned\n`;
      });
      response += `\n🌟 These cleaners are making a great impact on the platform!`;
      return response;
    }
    
    // Commission query
    if (message.includes('commission') || message.includes('revenue') || message.includes('earning')) {
      const adminCommission = (stats.totalPayments * 8) / 100;
      const cleanerCash = (stats.totalPayments * 90) / 100;
      const userPoints = (stats.totalPayments * 1) / 100;
      const cleanerPoints = (stats.totalPayments * 1) / 100;
      
      return `💰 **Commission & Revenue Breakdown**\n\n📊 **Payment Distribution**\n• Total Payment: ₹${stats.totalPayments.toLocaleString()}\n• Admin Commission (8%): ₹${adminCommission.toLocaleString()}\n• Cleaner Cash (90%): ₹${cleanerCash.toLocaleString()}\n• User Points (1%): ${Math.floor(userPoints)} pts\n• Cleaner Points (1%): ${Math.floor(cleanerPoints)} pts\n\n📈 **Performance Metrics**\n• Total Commission Collected: ₹${stats.totalCommission.toLocaleString()}\n• Average Commission/Job: ₹${stats.avgCommission.toLocaleString()}\n• Total Jobs Completed: ${stats.totalJobs}\n\n💡 Platform Revenue: ₹${stats.totalCommission.toLocaleString()}`;
    }
    
    // Reports query
    if (message.includes('report') || message.includes('waste')) {
      // Calculate waste type distribution
      const wasteTypes = {
        plastic: 0, organic: 0, electronic: 0, hazardous: 0, mixed: 0, other: 0
      };
      reports?.forEach(report => {
        if (wasteTypes[report.wasteType] !== undefined) {
          wasteTypes[report.wasteType]++;
        }
      });
      
      return `📝 **Waste Reports Analysis**\n\n📊 **Status Breakdown**\n• Total Reports: ${stats.totalReports}\n• Completed: ${stats.completedJobs} (${stats.totalReports > 0 ? Math.round((stats.completedJobs / stats.totalReports) * 100) : 0}%)\n• Pending: ${stats.pendingJobs}\n• Rejected: ${stats.rejectedJobs}\n\n🗑️ **Waste Type Distribution**\n• Plastic: ${wasteTypes.plastic}\n• Organic: ${wasteTypes.organic}\n• Electronic: ${wasteTypes.electronic}\n• Hazardous: ${wasteTypes.hazardous}\n• Mixed: ${wasteTypes.mixed}\n• Other: ${wasteTypes.other}\n\n💡 Most common waste type: ${Object.entries(wasteTypes).sort((a,b) => b[1] - a[1])[0]?.[0] || 'None'} waste`;
    }
    
    // Points query
    if (message.includes('point') || message.includes('points')) {
      return `⭐ **Points System Overview**\n\n📊 **Points Distribution**\n• Total User Points Earned: ${Math.floor(stats.totalUserPoints)} pts\n• Total Cleaner Points Earned: ${Math.floor(stats.totalCleanerPoints)} pts\n• Total Points Distributed: ${Math.floor(stats.totalUserPoints + stats.totalCleanerPoints)} pts\n\n💰 **Point Value**\n• 1 point = ₹1\n• Points can be redeemed to wallet balance\n\n📈 **Points Activity**\n• Users earn 1% of payment as points\n• Cleaners earn 1% of payment as points\n• Redeem points anytime from dashboard`;
    }
    
    // Growth query
    if (message.includes('growth') || message.includes('trend') || message.includes('performance')) {
      const monthlyGrowth = stats?.monthlyStats?.length > 1 ? 
        ((stats.monthlyStats[0]?.totalJobs - stats.monthlyStats[1]?.totalJobs) / (stats.monthlyStats[1]?.totalJobs || 1) * 100).toFixed(1) : 0;
      
      return `📈 **Platform Growth & Trends**\n\n🚀 **Growth Metrics**\n• Total Jobs Completed: ${stats.totalJobs}\n• Monthly Growth Rate: ${monthlyGrowth > 0 ? '+' : ''}${monthlyGrowth}%\n• Total Users: ${stats.totalUsers}\n• Total Cleaners: ${stats.totalCleaners}\n\n💰 **Revenue Growth**\n• Total Commission: ₹${stats.totalCommission.toLocaleString()}\n• Average Commission/Job: ₹${stats.avgCommission.toLocaleString()}\n\n📊 **Platform Health**: ${stats.completedJobs > stats.pendingJobs ? 'Excellent ✅' : 'Moderate ⚠️'}\n\n💡 **Recommendation**: ${stats.completedJobs < stats.pendingJobs ? 'Focus on completing pending jobs to improve platform health.' : 'Keep up the great work! The platform is growing steadily.'}`;
    }
    
    // Default response for unrecognized queries
    return `🤔 I understand you're asking about "${userMessage}". Here's what I can help with:\n\n📊 Platform Statistics (users, jobs, revenue)\n👥 User Information (top users, spending)\n💰 Commission Details (earnings, distribution)\n📝 Report Analysis (waste types, status)\n🧹 Cleaner Performance (top cleaners, ratings)\n⭐ Points System (earnings, redemption)\n\nCould you please rephrase your question? For example:\n• "Show me platform overview"\n• "How many total users?"\n• "What is the total commission?"\n• "Who are the top cleaners?"`;
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;
    
    // Add user message
    const userMessageObj = {
      id: messages.length + 1,
      type: 'user',
      text: inputMessage
    };
    setMessages(prev => [...prev, userMessageObj]);
    setInputMessage('');
    setIsTyping(true);
    
    // Generate bot response
    setTimeout(async () => {
      const botResponse = await generateResponse(inputMessage);
      const botMessageObj = {
        id: messages.length + 2,
        type: 'bot',
        text: botResponse
      };
      setMessages(prev => [...prev, botMessageObj]);
      setIsTyping(false);
    }, 500);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  const getCurrentTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <>
      {/* Chat Button */}
      <button 
        className={`chatbot-button ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? '✕' : '🤖'}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="chatbot-window">
          <div className="chatbot-header">
            <div className="chatbot-header-info">
              <div className="chatbot-avatar">🤖</div>
              <div>
                <h3>AI Assistant</h3>
                <p>Online • {getCurrentTimeGreeting()}!</p>
              </div>
            </div>
            <button className="chatbot-minimize" onClick={() => setIsOpen(false)}>
              −
            </button>
          </div>

          <div className="chatbot-messages">
            {messages.map((message) => (
              <div key={message.id} className={`message ${message.type}`}>
                <div className="message-avatar">
                  {message.type === 'bot' ? '🤖' : '👤'}
                </div>
                <div className="message-content">
                  <div className="message-text">
                    {message.text.split('\n').map((line, i) => (
                      <React.Fragment key={i}>
                        {line}
                        {i < message.text.split('\n').length - 1 && <br />}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="message bot">
                <div className="message-avatar">🤖</div>
                <div className="message-content">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chatbot-input">
            <input
              ref={inputRef}
              type="text"
              placeholder="Ask me anything about the platform..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
            />
            <button onClick={handleSendMessage}>
              Send
            </button>
          </div>
          
          <div className="chatbot-suggestions">
            <button onClick={() => setInputMessage('Show platform overview')}>📊 Overview</button>
            <button onClick={() => setInputMessage('Total users and cleaners')}>👥 Users</button>
            <button onClick={() => setInputMessage('Commission details')}>💰 Commission</button>
            <button onClick={() => setInputMessage('Top cleaners')}>🧹 Top Cleaners</button>
          </div>
        </div>
      )}
    </>
  );
};

export default AIChatbot;