import React, { useState, useEffect } from 'react';

const Settings = ({ user, setUser }) => {
  const [activeSection, setActiveSection] = useState('profile');
  const [settings, setSettings] = useState({
    notifications: {
      email: true,
      desktop: true,
      sound: true,
      taskUpdates: true,
      fileSharing: true,
      mentions: true
    },
    appearance: {
      theme: 'light',
      language: 'en',
      timezone: 'UTC',
      dateFormat: 'MM/DD/YYYY'
    },
    privacy: {
      profileVisibility: 'team',
      activityStatus: true,
      readReceipts: true
    },
    integrations: {
      googleCalendar: false,
      slack: false,
      github: false,
      trello: false
    }
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/settings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSettings(prev => ({ ...prev, ...data }));
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const updateSettings = async (section, newSettings) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          section,
          settings: newSettings
        })
      });
      
      if (response.ok) {
        setSettings(prev => ({
          ...prev,
          [section]: newSettings
        }));
        setMessage('Settings updated successfully');
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      setMessage('Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationChange = (key, value) => {
    const newNotifications = { ...settings.notifications, [key]: value };
    setSettings(prev => ({ ...prev, notifications: newNotifications }));
    updateSettings('notifications', newNotifications);
  };

  const handleAppearanceChange = (key, value) => {
    const newAppearance = { ...settings.appearance, [key]: value };
    setSettings(prev => ({ ...prev, appearance: newAppearance }));
    updateSettings('appearance', newAppearance);
  };

  const handlePrivacyChange = (key, value) => {
    const newPrivacy = { ...settings.privacy, [key]: value };
    setSettings(prev => ({ ...prev, privacy: newPrivacy }));
    updateSettings('privacy', newPrivacy);
  };

  const handleIntegrationChange = (key, value) => {
    const newIntegrations = { ...settings.integrations, [key]: value };
    setSettings(prev => ({ ...prev, integrations: newIntegrations }));
    updateSettings('integrations', newIntegrations);
  };

  return (
    <div className="settings-component">
      <div className="settings-header">
        <h2>⚙️ Settings</h2>
        {message && <div className="settings-message">{message}</div>}
      </div>

      <div className="settings-layout">
        <div className="settings-sidebar">
          <div className="settings-nav">
            <button 
              className={activeSection === 'profile' ? 'active' : ''}
              onClick={() => setActiveSection('profile')}
            >
              👤 Profile
            </button>
            <button 
              className={activeSection === 'notifications' ? 'active' : ''}
              onClick={() => setActiveSection('notifications')}
            >
              🔔 Notifications
            </button>
            <button 
              className={activeSection === 'appearance' ? 'active' : ''}
              onClick={() => setActiveSection('appearance')}
            >
              🎨 Appearance
            </button>
            <button 
              className={activeSection === 'privacy' ? 'active' : ''}
              onClick={() => setActiveSection('privacy')}
            >
              🔒 Privacy
            </button>
            <button 
              className={activeSection === 'integrations' ? 'active' : ''}
              onClick={() => setActiveSection('integrations')}
            >
              🔗 Integrations
            </button>
          </div>
        </div>

        <div className="settings-content">
          {activeSection === 'profile' && (
            <div className="settings-section">
              <h3>Profile Settings</h3>
              <div className="setting-item">
                <label>Display Name</label>
                <input type="text" value={user.name} readOnly />
                <small>Contact admin to change your display name</small>
              </div>
              <div className="setting-item">
                <label>Email</label>
                <input type="email" value={user.email} readOnly />
                <small>Contact admin to change your email</small>
              </div>
              <div className="setting-item">
                <label>Role</label>
                <input type="text" value={user.role} readOnly />
              </div>
              <div className="setting-item">
                <label>Group ID</label>
                <input type="text" value={user.group_id} readOnly />
              </div>
            </div>
          )}

          {activeSection === 'notifications' && (
            <div className="settings-section">
              <h3>Notification Preferences</h3>
              
              <div className="setting-group">
                <h4>General Notifications</h4>
                <div className="setting-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={settings.notifications.email}
                      onChange={(e) => handleNotificationChange('email', e.target.checked)}
                    />
                    Email Notifications
                  </label>
                  <small>Receive notifications via email</small>
                </div>
                
                <div className="setting-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={settings.notifications.desktop}
                      onChange={(e) => handleNotificationChange('desktop', e.target.checked)}
                    />
                    Desktop Notifications
                  </label>
                  <small>Show desktop notifications when app is open</small>
                </div>
                
                <div className="setting-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={settings.notifications.sound}
                      onChange={(e) => handleNotificationChange('sound', e.target.checked)}
                    />
                    Sound Notifications
                  </label>
                  <small>Play sound for notifications</small>
                </div>
              </div>

              <div className="setting-group">
                <h4>Activity Notifications</h4>
                <div className="setting-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={settings.notifications.taskUpdates}
                      onChange={(e) => handleNotificationChange('taskUpdates', e.target.checked)}
                    />
                    Task Updates
                  </label>
                  <small>Get notified when tasks are updated</small>
                </div>
                
                <div className="setting-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={settings.notifications.fileSharing}
                      onChange={(e) => handleNotificationChange('fileSharing', e.target.checked)}
                    />
                    File Sharing
                  </label>
                  <small>Get notified when files are shared</small>
                </div>
                
                <div className="setting-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={settings.notifications.mentions}
                      onChange={(e) => handleNotificationChange('mentions', e.target.checked)}
                    />
                    Mentions
                  </label>
                  <small>Get notified when you're mentioned</small>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'appearance' && (
            <div className="settings-section">
              <h3>Appearance Settings</h3>
              
              <div className="setting-item">
                <label>Theme</label>
                <select
                  value={settings.appearance.theme}
                  onChange={(e) => handleAppearanceChange('theme', e.target.value)}
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="auto">Auto</option>
                </select>
                <small>Choose your preferred theme</small>
              </div>
              
              <div className="setting-item">
                <label>Language</label>
                <select
                  value={settings.appearance.language}
                  onChange={(e) => handleAppearanceChange('language', e.target.value)}
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                </select>
                <small>Select your preferred language</small>
              </div>
              
              <div className="setting-item">
                <label>Timezone</label>
                <select
                  value={settings.appearance.timezone}
                  onChange={(e) => handleAppearanceChange('timezone', e.target.value)}
                >
                  <option value="UTC">UTC</option>
                  <option value="EST">Eastern Time</option>
                  <option value="PST">Pacific Time</option>
                  <option value="GMT">Greenwich Mean Time</option>
                </select>
                <small>Set your timezone for accurate timestamps</small>
              </div>
              
              <div className="setting-item">
                <label>Date Format</label>
                <select
                  value={settings.appearance.dateFormat}
                  onChange={(e) => handleAppearanceChange('dateFormat', e.target.value)}
                >
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
                <small>Choose your preferred date format</small>
              </div>
            </div>
          )}

          {activeSection === 'privacy' && (
            <div className="settings-section">
              <h3>Privacy Settings</h3>
              
              <div className="setting-item">
                <label>Profile Visibility</label>
                <select
                  value={settings.privacy.profileVisibility}
                  onChange={(e) => handlePrivacyChange('profileVisibility', e.target.value)}
                >
                  <option value="team">Team Only</option>
                  <option value="organization">Organization</option>
                  <option value="public">Public</option>
                </select>
                <small>Control who can see your profile</small>
              </div>
              
              <div className="setting-item">
                <label>
                  <input
                    type="checkbox"
                    checked={settings.privacy.activityStatus}
                    onChange={(e) => handlePrivacyChange('activityStatus', e.target.checked)}
                  />
                  Show Activity Status
                </label>
                <small>Let others see when you're online</small>
              </div>
              
              <div className="setting-item">
                <label>
                  <input
                    type="checkbox"
                    checked={settings.privacy.readReceipts}
                    onChange={(e) => handlePrivacyChange('readReceipts', e.target.checked)}
                  />
                  Read Receipts
                </label>
                <small>Show when you've read messages</small>
              </div>
            </div>
          )}

          {activeSection === 'integrations' && (
            <div className="settings-section">
              <h3>Third-party Integrations</h3>
              
              <div className="integration-item">
                <div className="integration-info">
                  <div className="integration-icon">📅</div>
                  <div className="integration-details">
                    <h4>Google Calendar</h4>
                    <p>Sync your events with Google Calendar</p>
                  </div>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.integrations.googleCalendar}
                    onChange={(e) => handleIntegrationChange('googleCalendar', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
              
              <div className="integration-item">
                <div className="integration-info">
                  <div className="integration-icon">💬</div>
                  <div className="integration-details">
                    <h4>Slack</h4>
                    <p>Connect with your Slack workspace</p>
                  </div>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.integrations.slack}
                    onChange={(e) => handleIntegrationChange('slack', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
              
              <div className="integration-item">
                <div className="integration-info">
                  <div className="integration-icon">🐙</div>
                  <div className="integration-details">
                    <h4>GitHub</h4>
                    <p>Link your GitHub repositories</p>
                  </div>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.integrations.github}
                    onChange={(e) => handleIntegrationChange('github', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
              
              <div className="integration-item">
                <div className="integration-info">
                  <div className="integration-icon">📋</div>
                  <div className="integration-details">
                    <h4>Trello</h4>
                    <p>Sync with your Trello boards</p>
                  </div>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.integrations.trello}
                    onChange={(e) => handleIntegrationChange('trello', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
