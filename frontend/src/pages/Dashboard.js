import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import ReporterDashboard from './ReporterDashboard';
import CleanerDashboard from './CleanerDashboard';

const Dashboard = () => {
  const { user } = useAuth();

  if (!user) {
    return <div>Loading...</div>;
  }

  return user.role === 'user' ? <ReporterDashboard /> : <CleanerDashboard />;
};


export default Dashboard;