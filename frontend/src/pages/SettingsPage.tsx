import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { Header } from '../components/Layout/Header';
import { Sidebar } from '../components/Layout/Sidebar';
import { setUser } from '../store/slices/authSlice';
import api from '../services/api';
import '../styles/Settings.css';

interface UserSettings {
  id: number;
  email: string;
  name: string;
  role: string;
  target_channel_id?: string;
  target_channel_name?: string;
  youtube_access_token?: string;
  created_at: string;
  updated_at: string;
}

interface SourceChannel {
  id: number;
  channel_id: string;
  channel_name: string;
}

export const SettingsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [sourceChannels, setSourceChannels] = useState<SourceChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [youtubeAuthorized, setYoutubeAuthorized] = useState(false);
  const [youtubeLoading, setYoutubeLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    target_channel_id: '',
  });

  useEffect(() => {
    loadSettings();
    loadSourceChannels();
    checkYoutubeAuth();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await api.get('/settings');
      setSettings(response.data);
      setFormData({
        name: response.data.name,
        target_channel_id: response.data.target_channel_id || '',
      });
      setLoading(false);
    } catch (err) {
      setError('Failed to load settings');
      setLoading(false);
    }
  };

  const loadSourceChannels = async () => {
    try {
      const response = await api.get('/destination-channels');
      setSourceChannels(response.data);
    } catch (err) {
      console.error('Failed to load destination channels:', err);
    }
  };

  const checkYoutubeAuth = async () => {
    try {
      const response = await api.get('/youtube/status');
      setYoutubeAuthorized(response.data.authorized);
    } catch (err) {
      setYoutubeAuthorized(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (!formData.name.trim()) {
        setError('Name is required');
        setLoading(false);
        return;
      }

      const targetChannel = sourceChannels.find((ch) => ch.channel_id === formData.target_channel_id);
      
      const response = await api.put('/settings', {
        name: formData.name.trim(),
        target_channel_id: formData.target_channel_id || null,
        target_channel_name: targetChannel?.channel_name || null,
      });

      setSettings(response.data);
      dispatch(setUser(response.data));
      setSuccess('✓ Settings saved successfully!');
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error saving settings:', err);
      setError(err.response?.data?.error || 'Failed to save settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleYoutubeAuth = async () => {
    setYoutubeLoading(true);
    setError(null);

    try {
      const response = await api.get('/youtube/auth-url');
      const authUrl = response.data.authUrl;
      
      console.log('Opening auth URL:', authUrl);
      
      // Open auth window
      const authWindow = window.open(authUrl, 'youtube-auth', 'width=600,height=700');
      
      if (!authWindow) {
        setError('Popup blocked. Please allow popups for this site.');
        setYoutubeLoading(false);
        return;
      }
      
      // Check for completion every 1 second
      const checkInterval = setInterval(async () => {
        try {
          // Try to check if window closed
          if (authWindow.closed) {
            clearInterval(checkInterval);
            setYoutubeLoading(false);
            
            // Refresh auth status
            await new Promise(resolve => setTimeout(resolve, 1000));
            await checkYoutubeAuth();
            setSuccess('✓ YouTube authorization successful!');
            setTimeout(() => setSuccess(null), 3000);
          }
        } catch (err) {
          // Ignore errors during interval check
        }
      }, 1000);
      
      // Timeout after 10 minutes
      setTimeout(() => {
        clearInterval(checkInterval);
        if (!authWindow.closed) {
          authWindow.close();
        }
        setYoutubeLoading(false);
        setError('Authorization timeout. Please try again.');
      }, 600000);
      
    } catch (err) {
      console.error('YouTube auth error:', err);
      setError('Failed to start YouTube authorization');
      setYoutubeLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="settings-page">
        <Header />
        <div className="settings-content">
          <Sidebar />
          <main className="main-content">
            <p>Loading settings...</p>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <Header />
      <div className="settings-content">
        <Sidebar />
        <main className="main-content">
          <section className="settings-section">
            <h1>⚙️ Settings & Destination Channel</h1>

            {error && <div className="alert error">{error}</div>}
            {success && <div className="alert success">{success}</div>}

            <form onSubmit={handleSubmit} className="settings-form">
              {/* Profile Info */}
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={settings?.email || ''}
                  disabled
                  className="input-disabled"
                />
                <small>Email cannot be changed</small>
              </div>

              <div className="form-group">
                <label>Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Your name"
                  required
                  className="input-field"
                />
              </div>

              {/* Destination Channel Selection */}
              <div className="form-group">
                <label>Destination Channel (Where videos will be posted)</label>
                <select
                  name="target_channel_id"
                  value={formData.target_channel_id}
                  onChange={handleInputChange}
                  className="input-field"
                  style={{ color: '#000000' }}
                >
                  <option value="" style={{ color: '#000000' }}>-- Select a channel --</option>
                  {sourceChannels.map((channel) => (
                    <option key={channel.id} value={channel.channel_id} style={{ color: '#000000' }}>
                      {channel.channel_name} ({channel.channel_id})
                    </option>
                  ))}
                </select>
                <small>
                  {sourceChannels.length === 0
                    ? 'No destination channels added yet. Go to Dashboard to add channels.'
                    : 'Select which destination channel videos should be posted to'}
                </small>
              </div>

              {/* Current Target Channel */}
              {settings?.target_channel_name && (
                <div className="form-group info-box">
                  <h3>Current Target Channel</h3>
                  <p>
                    <strong>{settings.target_channel_name}</strong>
                  </p>
                  <p>
                    <code>{settings.target_channel_id}</code>
                  </p>
                </div>
              )}

              {/* YouTube Authorization */}
              <div className="form-group info-box" style={{ backgroundColor: youtubeAuthorized ? 'rgba(0, 255, 0, 0.05)' : 'rgba(255, 0, 0, 0.05)', borderColor: youtubeAuthorized ? '#00ff00' : '#ff0000' }}>
                <h3>🎥 YouTube Authorization</h3>
                <p style={{ marginBottom: '15px' }}>
                  {youtubeAuthorized ? (
                    <span style={{ color: '#00ff00' }}>✓ YouTube authorized - Auto upload enabled</span>
                  ) : (
                    <span style={{ color: '#ff6b6b' }}>⚠️ YouTube authorization required for automatic uploads</span>
                  )}
                </p>
                {!youtubeAuthorized && (
                  <button
                    type="button"
                    onClick={handleYoutubeAuth}
                    disabled={youtubeLoading}
                    style={{
                      backgroundColor: '#ff0000',
                      color: 'white',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: '4px',
                      cursor: youtubeLoading ? 'not-allowed' : 'pointer',
                      opacity: youtubeLoading ? 0.6 : 1,
                      fontWeight: '600',
                    }}
                  >
                    {youtubeLoading ? 'Authorizing...' : '🔗 Authorize YouTube'}
                  </button>
                )}
                <small style={{ display: 'block', marginTop: '10px', color: '#999' }}>
                  This allows automatic upload of videos to your destination channel
                </small>
              </div>

              {/* Account Info */}
              <div className="form-group info-box">
                <h3>Account Information</h3>
                <p>
                  <strong>Role:</strong> {settings?.role || 'user'}
                </p>
                <p>
                  <strong>Created:</strong> {new Date(settings?.created_at || '').toLocaleDateString()}
                </p>
                <p>
                  <strong>Last Updated:</strong> {new Date(settings?.updated_at || '').toLocaleDateString()}
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
                style={{ marginTop: '20px' }}
              >
                {loading ? 'Saving...' : '💾 Save Settings'}
              </button>
            </form>
          </section>
        </main>
      </div>
    </div>
  );
};

export default SettingsPage;