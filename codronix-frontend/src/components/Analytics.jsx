import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Loader2, AlertCircle } from 'lucide-react';
import '../styles/global.css';

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300'];

const Analytics = ({ user, socket }) => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [userActivityData, setUserActivityData] = useState([]);
  const [tasksCompletedData, setTasksCompletedData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await fetch(`/api/analytics/${user.group_id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch analytics data');
        }
        const data = await response.json();
        setAnalyticsData(data);
      } catch (err) {
        console.error('Error fetching analytics:', err);
        setError('Failed to load analytics data.');
      } finally {
        setLoading(false);
      }
    };
    
    if (user && user.group_id) {
      fetchAnalytics();
    }

    if (socket) {
      const handleAnalyticsUpdate = (data) => {
        console.log('📈 Analytics data updated via socket:', data);
        setAnalyticsData(data);
      };
      
      socket.on('analytics-update', handleAnalyticsUpdate);
      
      return () => {
        socket.off('analytics-update', handleAnalyticsUpdate);
      };
    }
  }, [user, socket]);
  
  useEffect(() => {
    if (analyticsData) {
      // Process user activity data
      if (analyticsData.recentActivities) {
        const activityCounts = analyticsData.recentActivities.reduce((acc, activity) => {
          // 💡 FIXED: Use optional chaining to safely access `activity.user`
          const userName = activity.user?.name || (activity.user?.id ? `User ID: ${activity.user.id}` : 'Unknown User');
          if (userName) {
            acc[userName] = (acc[userName] || 0) + 1;
          }
          return acc;
        }, {});
        
        const formattedData = Object.entries(activityCounts).map(([name, value]) => ({ name, value }));
        setUserActivityData(formattedData);
      }
      
      // Process tasks completed by user data (New Logic)
      if (analyticsData.tasksCompletedByUser) {
        const formattedTasksData = Object.entries(analyticsData.tasksCompletedByUser).map(([name, value]) => ({ name, value }));
        setTasksCompletedData(formattedTasksData);
      } else {
        setTasksCompletedData([]);
      }
    }
  }, [analyticsData]);

  if (loading) {
    return (
      <div className="analytics-container loading">
        <Loader2 className="animate-spin" size={48} />
        <p>Loading analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analytics-container error">
        <AlertCircle size={48} />
        <p>{error}</p>
      </div>
    );
  }

  if (!analyticsData || Object.keys(analyticsData).length === 0) {
    return (
      <div className="analytics-container no-data">
        <p>No analytics data available yet. Start collaborating to see insights!</p>
      </div>
    );
  }

  const taskStatusData = analyticsData.taskStatusCounts ? Object.entries(analyticsData.taskStatusCounts).map(([name, value]) => ({ name, value })) : [];
  
  const fileTypeData = analyticsData.fileTypeCounts
    ? Object.entries(analyticsData.fileTypeCounts).map(([name, value]) => ({ 
        name: name === 'null' || !name ? 'Unknown Type' : name, 
        value 
      })) 
    : [];

  return (
    <div className="analytics-container">
      <h2>Group Analytics Dashboard</h2>
      <div className="analytics-grid">
        <div className="card">
          <h3>Task Status Overview</h3>
          <ResponsiveContainer width="100%" height={300}>
            {taskStatusData.length > 0 ? (
              <BarChart data={taskStatusData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#8884d8" name="Tasks" />
              </BarChart>
            ) : (
              <p className="chart-placeholder">No task data available.</p>
            )}
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3>File Type Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            {fileTypeData.length > 0 ? (
              <PieChart>
                <Pie
                  data={fileTypeData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#82ca9d"
                  label
                >
                  {fileTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            ) : (
              <p className="chart-placeholder">No file data available.</p>
            )}
          </ResponsiveContainer>
        </div>
        
        <div className="card">
          <h3>User Activity Count</h3>
          <ResponsiveContainer width="100%" height={300}>
            {userActivityData.length > 0 ? (
              <BarChart data={userActivityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#8884d8" name="Activity Count" />
              </BarChart>
            ) : (
              <p className="chart-placeholder">No user activity to display.</p>
            )}
          </ResponsiveContainer>
        </div>

        {/* New Card for Tasks Completed by User */}
        <div className="card full-width">
          <h3>Tasks Completed by Member</h3>
          <ResponsiveContainer width="100%" height={300}>
            {tasksCompletedData.length > 0 ? (
              <BarChart data={tasksCompletedData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#ff7300" name="Tasks Completed" />
              </BarChart>
            ) : (
              <p className="chart-placeholder">No tasks have been completed yet.</p>
            )}
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Analytics;