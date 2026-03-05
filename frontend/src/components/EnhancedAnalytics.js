import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, AreaChart, Area, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, subDays, startOfDay } from 'date-fns';
import '../styles/analytics.css';

const EnhancedAnalytics = ({ stats }) => {
  const [timeRange, setTimeRange] = useState('30'); // days
  const [selectedMetric, setSelectedMetric] = useState('requests');

  const COLORS = ['#6366f1', '#8b5cf6', '#d946ef', '#f59e0b', '#10b981', '#3b82f6'];

  // Prepare trend data
  const getTrendData = () => {
    if (!stats?.trends?.daily) return [];
    
    return stats.trends.daily.slice(-parseInt(timeRange)).map(item => ({
      date: format(new Date(item.date), 'MMM dd'),
      requests: item.count,
      resolved: item.resolved || 0,
      pending: item.pending || 0
    }));
  };

  // Category distribution
  const getCategoryData = () => {
    if (!stats?.categoryBreakdown) return [];
    
    const total = stats.overview?.totalRequests || 1;
    return Object.entries(stats.categoryBreakdown).map(([key, value]) => ({
      name: key.replace('_', ' ').toUpperCase(),
      value: value,
      percentage: ((value / total) * 100).toFixed(1)
    }));
  };

  // Status distribution
  const getStatusData = () => {
    if (!stats?.overview) return [];
    
    const statusMap = {
      pending: stats.overview.pendingRequests || 0,
      in_progress: stats.overview.inProgressRequests || 0,
      resolved: stats.overview.resolvedRequests || 0,
      closed: stats.overview.closedRequests || 0
    };

    return Object.entries(statusMap)
      .filter(([key, value]) => value > 0)
      .map(([key, value]) => ({
        name: key.replace('_', ' ').toUpperCase(),
        value: value
      }));
  };

  // Priority distribution
  const getPriorityData = () => {
    if (!stats?.priorityBreakdown) return [];
    
    return Object.entries(stats.priorityBreakdown).map(([key, value]) => ({
      name: key.toUpperCase(),
      value: value
    }));
  };

  // Response time data
  const getResponseTimeData = () => {
    if (!stats?.responseTime) return [];
    
    return [
      { name: 'Avg Response', hours: stats.responseTime.average || 0 },
      { name: 'Fastest', hours: stats.responseTime.fastest || 0 },
      { name: 'Slowest', hours: stats.responseTime.slowest || 0 }
    ];
  };

  // Calculate insights
  const getInsights = () => {
    const insights = [];
    
    if (stats?.overview) {
      const total = stats.overview.totalRequests || 0;
      const closed = stats.overview.closedRequests || 0;
      const pending = stats.overview.pendingRequests || 0;
      const completionRate = total > 0 ? ((closed / total) * 100) : 0;
      
      insights.push({
        icon: '📊',
        title: 'Completion Rate',
        value: `${completionRate.toFixed(1)}%`,
        trend: completionRate > 70 ? 'positive' : completionRate > 40 ? 'neutral' : 'negative',
        description: `${closed} of ${total} requests completed`
      });

      const pendingRate = total > 0 ? ((pending / total) * 100) : 0;
      insights.push({
        icon: '⏳',
        title: 'Pending Rate',
        value: `${pendingRate.toFixed(1)}%`,
        trend: pendingRate < 30 ? 'positive' : pendingRate < 50 ? 'neutral' : 'negative',
        description: `${pending} requests awaiting action`
      });

      const avgTime = stats.overview.avgResolutionTime || 0;
      insights.push({
        icon: '⚡',
        title: 'Avg Resolution',
        value: `${avgTime.toFixed(1)} days`,
        trend: avgTime < 3 ? 'positive' : avgTime < 7 ? 'neutral' : 'negative',
        description: 'Average time to resolve'
      });

      const activeUsers = stats.overview.totalUsers || 0;
      insights.push({
        icon: '👥',
        title: 'Active Users',
        value: activeUsers,
        trend: 'neutral',
        description: 'Total registered users'
      });
    }
    
    return insights;
  };

  return (
    <div className="enhanced-analytics">
      {/* Insights Cards */}
      <div className="insights-grid">
      {getInsights().map((insight, idx) => (
        <div key={idx} className={`insight-card ${insight.trend}`}>
          <div className="insight-icon">{insight.icon}</div>
          <div className="insight-content">
            <h4>{insight.title}</h4>
            <div className="insight-value">{insight.value}</div>
            <p className="insight-description">{insight.description}</p>
          </div>
        </div>
      ))}
      </div>

      {/* Time Range Selector */}
      <div className="analytics-controls">
        <div className="control-group">
          <label>Time Range:</label>
          <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)}>
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 90 Days</option>
          </select>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="analytics-charts-grid">
        {/* Trend Line Chart */}
        <div className="chart-card full-width">
          <div className="chart-header">
            <h3>📈 Request Trends Over Time</h3>
            <span className="chart-subtitle">Daily request volume and resolution rate</span>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={getTrendData()}>
              <defs>
                <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                }}
              />
              <Legend />
              <Area type="monotone" dataKey="requests" stroke="#6366f1" fillOpacity={1} fill="url(#colorRequests)" name="Total Requests" />
              <Area type="monotone" dataKey="resolved" stroke="#10b981" fillOpacity={1} fill="url(#colorResolved)" name="Resolved" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Category Pie Chart */}
        <div className="chart-card">
          <div className="chart-header">
            <h3>🎯 Category Distribution</h3>
            <span className="chart-subtitle">Requests by category</span>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={getCategoryData()}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percentage }) => `${name}: ${percentage}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {getCategoryData().map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Status Bar Chart */}
        <div className="chart-card">
          <div className="chart-header">
            <h3>📊 Status Overview</h3>
            <span className="chart-subtitle">Current request status</span>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={getStatusData()}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
              <Bar dataKey="value" fill="#6366f1" radius={[8, 8, 0, 0]}>
                {getStatusData().map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Priority Distribution */}
        <div className="chart-card">
          <div className="chart-header">
            <h3>⚡ Priority Breakdown</h3>
            <span className="chart-subtitle">Requests by priority level</span>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={getPriorityData()} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" stroke="#6b7280" />
              <YAxis dataKey="name" type="category" stroke="#6b7280" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
              <Bar dataKey="value" fill="#8b5cf6" radius={[0, 8, 8, 0]}>
                {getPriorityData().map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Performance Summary */}
      <div className="performance-summary">
        <h3>📋 Performance Summary</h3>
        <div className="summary-grid">
          <div className="summary-item">
            <span className="summary-label">Total Requests</span>
            <span className="summary-value">{stats?.overview?.totalRequests || 0}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Completion Rate</span>
            <span className="summary-value">
              {stats?.overview?.totalRequests > 0 
                ? ((stats.overview.closedRequests / stats.overview.totalRequests) * 100).toFixed(1) 
                : 0}%
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Avg Resolution Time</span>
            <span className="summary-value">{stats?.overview?.avgResolutionTime?.toFixed(1) || 0} days</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Active Technicians</span>
            <span className="summary-value">{stats?.overview?.totalTechnicians || 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedAnalytics;
