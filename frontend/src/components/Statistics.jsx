import { useState, useEffect } from 'react';
import { studentAPI } from '../services/api';
import './Statistics.css';

function Statistics() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await studentAPI.getAverageAge();
      setStats(data);
    } catch (err) {
      console.error('Error loading statistics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !stats) {
    return <div className="statistics loading">Loading statistics...</div>;
  }

  return (
    <div className="statistics">
      <h2>Statistics</h2>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Average Age</div>
          <div className="stat-value">{stats?.averageAge?.toFixed(2) || '0.00'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Students</div>
          <div className="stat-value">{stats?.studentCount || 0}</div>
        </div>
      </div>
    </div>
  );
}

export default Statistics;

