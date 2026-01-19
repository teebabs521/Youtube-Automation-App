import React, { useEffect, useState } from 'react';
import { useAppSelector } from '../hooks/redux';
import { Header } from '../components/Layout/Header';
import { Sidebar } from '../components/Layout/Sidebar';
import api from '../services/api';
import '../styles/Schedules.css';

interface Schedule {
  id: number;
  user_id: number;
  schedule_type: string;
  schedule_time: string;
  schedule_days?: string;
  max_videos_per_day: number;
  timezone: string;
  destination_channel_id?: string;
  is_active: number | boolean;
  created_at: string;
  updated_at: string;
}

interface DestinationChannel {
  id: number;
  channel_id: string;
  channel_name: string;
}

export const SchedulesPage: React.FC = () => {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [destinationChannels, setDestinationChannels] = useState<DestinationChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Schedule | null>(null);

  const [formData, setFormData] = useState({
    schedule_type: 'daily',
    schedule_time: '10:00',
    schedule_days: '',
    max_videos_per_day: 3,
    timezone: 'UTC',
    destination_channel_id: '',
    is_active: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await Promise.all([loadSchedules(), loadDestinationChannels()]);
    setLoading(false);
  };

  const loadSchedules = async () => {
    try {
      const response = await api.get('/schedules');
      setSchedules(response.data);
    } catch (err) {
      console.error('Failed to load schedules:', err);
      setError('Failed to load schedules');
    }
  };

  const loadDestinationChannels = async () => {
    try {
      const response = await api.get('/destination-channels');
      setDestinationChannels(response.data);
    } catch (err) {
      console.error('Failed to load destination channels:', err);
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as any;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.schedule_type || !formData.schedule_time) {
      setError('Schedule type and time are required');
      return;
    }

    if (!formData.destination_channel_id) {
      setError('Please select a destination channel');
      return;
    }

    try {
      if (editing) {
        await api.put(`/schedules/${editing.id}`, formData);
      } else {
        await api.post('/schedules', formData);
      }
      setError(null);
      await loadSchedules();
      setShowForm(false);
      setEditing(null);
      setFormData({
        schedule_type: 'daily',
        schedule_time: '10:00',
        schedule_days: '',
        max_videos_per_day: 3,
        timezone: 'UTC',
        destination_channel_id: '',
        is_active: true,
      });
    } catch (err: any) {
      console.error('Error saving schedule:', err);
      setError(err.response?.data?.error || 'Failed to save schedule');
    }
  };

  const handleEdit = (schedule: Schedule) => {
    setEditing(schedule);
    setFormData({
      schedule_type: schedule.schedule_type,
      schedule_time: schedule.schedule_time,
      schedule_days: schedule.schedule_days || '',
      max_videos_per_day: schedule.max_videos_per_day,
      timezone: schedule.timezone,
      destination_channel_id: schedule.destination_channel_id || '',
      is_active: !!schedule.is_active,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Delete this schedule?')) {
      try {
        await api.delete(`/schedules/${id}`);
        await loadSchedules();
      } catch (err) {
        setError('Failed to delete schedule');
      }
    }
  };

  const handleToggle = async (id: number) => {
    try {
      await api.patch(`/schedules/${id}/toggle`);
      await loadSchedules();
    } catch (err) {
      setError('Failed to toggle schedule');
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditing(null);
    setFormData({
      schedule_type: 'daily',
      schedule_time: '10:00',
      schedule_days: '',
      max_videos_per_day: 3,
      timezone: 'UTC',
      destination_channel_id: '',
      is_active: true,
    });
  };

  if (loading) {
    return (
      <div className="schedules-page">
        <Header />
        <div className="schedules-content">
          <Sidebar />
          <main className="main-content">
            <p>Loading...</p>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="schedules-page">
      <Header />
      <div className="schedules-content">
        <Sidebar />
        <main className="main-content">
          <section className="schedules-section">
            <div className="schedules-header">
              <h1>⏰ Posting Schedules</h1>
              <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
                {showForm ? '✕ Cancel' : '+ New Schedule'}
              </button>
            </div>

            {error && <div className="alert error">{error}</div>}

            {showForm && (
              <form onSubmit={handleSubmit} className="schedule-form">
                <h2>{editing ? 'Edit Schedule' : 'Create New Schedule'}</h2>

                <div className="form-row">
                  <div className="form-group">
                    <label>Schedule Type *</label>
                    <select
                      name="schedule_type"
                      value={formData.schedule_type}
                      onChange={handleFormChange}
                      className="input-field"
                      required
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Time *</label>
                    <input
                      type="time"
                      name="schedule_time"
                      value={formData.schedule_time}
                      onChange={handleFormChange}
                      className="input-field"
                      required
                    />
                  </div>
                </div>

                {formData.schedule_type === 'weekly' && (
                  <div className="form-group">
                    <label>Days (comma-separated)</label>
                    <input
                      type="text"
                      name="schedule_days"
                      value={formData.schedule_days}
                      onChange={handleFormChange}
                      placeholder="Monday,Wednesday,Friday"
                      className="input-field"
                    />
                  </div>
                )}

                <div className="form-group">
                  <label>Destination Channel *</label>
                  <select
                    name="destination_channel_id"
                    value={formData.destination_channel_id}
                    onChange={handleFormChange}
                    className="input-field"
                    required
                  >
                    <option value="">-- Select channel --</option>
                    {destinationChannels.map((ch) => (
                      <option key={ch.id} value={ch.channel_id}>
                        {ch.channel_name}
                      </option>
                    ))}
                  </select>
                  {destinationChannels.length === 0 && (
                    <small style={{ color: '#ff6b6b' }}>⚠️ Add destination channel on Dashboard</small>
                  )}
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Max Videos Per Day *</label>
                    <input
                      type="number"
                      name="max_videos_per_day"
                      value={formData.max_videos_per_day}
                      onChange={handleFormChange}
                      min="1"
                      max="10"
                      className="input-field"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Timezone</label>
                    <input
                      type="text"
                      name="timezone"
                      value={formData.timezone}
                      onChange={handleFormChange}
                      placeholder="UTC"
                      className="input-field"
                    />
                  </div>
                </div>

                <div className="form-group checkbox">
                  <input
                    type="checkbox"
                    id="is_active"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleFormChange}
                  />
                  <label htmlFor="is_active">Active</label>
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn-primary">
                    {editing ? '💾 Update' : '✓ Create'}
                  </button>
                  <button type="button" className="btn-secondary" onClick={handleCancel}>
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <div className="schedules-list">
              {schedules.length === 0 ? (
                <p className="empty-state">No schedules yet</p>
              ) : (
                schedules.map((schedule) => (
                  <div key={schedule.id} className={`schedule-card ${schedule.is_active ? 'active' : 'inactive'}`}>
                    <div className="schedule-info">
                      <div className="schedule-type">
                        <span className="badge">{schedule.schedule_type.toUpperCase()}</span>
                        <span className={`status ${schedule.is_active ? 'active' : 'inactive'}`}>
                          {schedule.is_active ? '🟢 Active' : '⚫ Inactive'}
                        </span>
                      </div>
                      <p><strong>⏱️ Time:</strong> {schedule.schedule_time}</p>
                      <p><strong>📹 Max/Day:</strong> {schedule.max_videos_per_day}</p>
                      <p><strong>🌍 TZ:</strong> {schedule.timezone}</p>
                      {schedule.destination_channel_id && (
                        <p><strong>📤 To:</strong> {schedule.destination_channel_id}</p>
                      )}
                      <p style={{ fontSize: '12px', color: '#999' }}>
                        {new Date(schedule.created_at).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="schedule-actions">
                      <button
                        className={`btn-toggle ${schedule.is_active ? 'active' : 'inactive'}`}
                        onClick={() => handleToggle(schedule.id)}
                      >
                        {schedule.is_active ? '⏸' : '▶'}
                      </button>
                      <button className="btn-edit" onClick={() => handleEdit(schedule)}>
                        ✏️
                      </button>
                      <button className="btn-delete" onClick={() => handleDelete(schedule.id)}>
                        🗑
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default SchedulesPage;