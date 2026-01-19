import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      const data = error.response?.data;

      if (data?.requiresLogin || data?.error === 'Token expired') {
        // Clear all auth data
        localStorage.removeItem('authToken');
        localStorage.removeItem('authUser');
        localStorage.removeItem('token');
        localStorage.removeItem('user');

        // Redirect to login
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  loginWithGoogle: (token: string) => api.post('/auth/google', { token }),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data: any) => api.put('/auth/profile', data),
};

// Channels API (Source Channels)
export const channelsAPI = {
  getChannels: () => api.get('/channels'),
  getChannel: (id: number) => api.get(`/channels/${id}`),
  addChannel: (channelId: string, channelName: string) =>
    api.post('/channels', { channel_id: channelId, channel_name: channelName }),
  updateChannel: (id: number, data: any) => api.put(`/channels/${id}`, data),
  deleteChannel: (id: number) => api.delete(`/channels/${id}`),
  refreshChannel: (id: number) => api.post(`/channels/${id}/refresh`),
};

// Destination Channels API
export const destinationChannelsAPI = {
  getChannels: () => api.get('/destination-channels'),
  getChannel: (id: number) => api.get(`/destination-channels/${id}`),
  addChannel: (channelId: string, channelName: string) =>
    api.post('/destination-channels', { channel_id: channelId, channel_name: channelName }),
  updateChannel: (id: number, data: any) => api.put(`/destination-channels/${id}`, data),
  deleteChannel: (id: number) => api.delete(`/destination-channels/${id}`),
};

// Videos API
export const videosAPI = {
  getVideos: (status?: string, channelId?: number) =>
    api.get('/videos', { params: { status, channel_id: channelId } }),
  getVideo: (id: number) => api.get(`/videos/${id}`),
  updateVideo: (id: number, data: any) => api.put(`/videos/${id}`, data),
  postVideo: (id: number) => api.post(`/videos/${id}/post`),
  scheduleVideo: (id: number, scheduledAt: string) =>
    api.post(`/videos/${id}/schedule`, { scheduled_at: scheduledAt }),
  retryVideo: (id: number) => api.post(`/videos/${id}/retry`),
  deleteVideo: (id: number) => api.delete(`/videos/${id}`),
  bulkDeleteVideos: (videoIds: number[]) => api.post('/videos/bulk-delete', { videoIds }),
  fetchChannelVideos: (channelId: number) => api.post(`/videos/channel/${channelId}/fetch`),
  getStats: () => api.get('/videos/stats'),
};

// Schedules API
export const schedulesAPI = {
  getSchedules: () => api.get('/schedules'),
  getSchedule: (id: number) => api.get(`/schedules/${id}`),
  createSchedule: (data: any) => api.post('/schedules', data),
  updateSchedule: (id: number, data: any) => api.put(`/schedules/${id}`, data),
  deleteSchedule: (id: number) => api.delete(`/schedules/${id}`),
  toggleSchedule: (id: number, isActive: boolean) =>
    api.patch(`/schedules/${id}`, { is_active: isActive }),
};

// YouTube API
export const youtubeAPI = {
  getAuthUrl: () => api.get('/youtube/auth-url'),
  getStatus: () => api.get('/youtube/status'),
  storeTokens: (tokens: { accessToken: string; refreshToken: string; expiryDate: number }) =>
    api.post('/youtube/store-tokens', tokens),
  revokeAuth: () => api.post('/youtube/revoke'),
};

// Settings API
export const settingsAPI = {
  getSettings: () => api.get('/settings'),
  updateSettings: (data: any) => api.put('/settings', data),
};

// Admin API
export const adminAPI = {
  // Users management
  getUsers: () => api.get('/admin/users'),
  getUser: (id: number) => api.get(`/admin/users/${id}`),
  updateUser: (id: number, data: any) => api.patch(`/admin/users/${id}`, data),
  deleteUser: (id: number) => api.delete(`/admin/users/${id}`),
  
  // Allowed emails management
  getAllowedEmails: () => api.get('/admin/allowed-emails'),
  getAllowedEmail: (id: number) => api.get(`/admin/allowed-emails/${id}`),
  addAllowedEmail: (email: string, notes?: string) =>
    api.post('/admin/allowed-emails', { email, notes }),
  updateAllowedEmail: (id: number, data: { email?: string; notes?: string; is_active?: boolean }) =>
    api.put(`/admin/allowed-emails/${id}`, data),
  deleteAllowedEmail: (id: number) => api.delete(`/admin/allowed-emails/${id}`),
  toggleAllowedEmail: (id: number) => api.patch(`/admin/allowed-emails/${id}/toggle`),
  
  // Stats and logs
  getStats: () => api.get('/admin/stats'),
  getLogs: (page?: number, limit?: number) =>
    api.get('/admin/logs', { params: { page, limit } }),
};

export default api;