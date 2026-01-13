import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  loginWithGoogle: (token: string) => api.post('/auth/google', { token }),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data: any) => api.put('/auth/profile', data),
};

export const channelsAPI = {
  getChannels: () => api.get('/channels'),
  addChannel: (channelId: string, channelName: string) =>
    api.post('/channels', { channel_id: channelId, channel_name: channelName }),
  deleteChannel: (id: number) => api.delete(`/channels/${id}`),
  refreshChannel: (id: number) => api.post(`/channels/${id}/refresh`),
};

export const videosAPI = {
  getVideos: (status?: string, channelId?: number) =>
    api.get('/videos', { params: { status, channel_id: channelId } }),
  updateVideo: (id: number, data: any) => api.put(`/videos/${id}`, data),
  postVideo: (id: number) => api.post(`/videos/${id}/post`),
  deleteVideo: (id: number) => api.delete(`/videos/${id}`),
  fetchChannelVideos: (channelId: number) => api.post(`/videos/channel/${channelId}/fetch`),
};

export const schedulesAPI = {
  getSchedules: () => api.get('/schedules'),
  createSchedule: (data: any) => api.post('/schedules', data),
  updateSchedule: (id: number, data: any) => api.put(`/schedules/${id}`, data),
  deleteSchedule: (id: number) => api.delete(`/schedules/${id}`),
};

export const adminAPI = {
  getUsers: () => api.get('/admin/users'),
  getUser: (id: number) => api.get(`/admin/users/${id}`),
  updateUser: (id: number, data: any) => api.patch(`/admin/users/${id}`, data),
  deleteUser: (id: number) => api.delete(`/admin/users/${id}`),
  getStats: () => api.get('/admin/stats'),
};

export default api;
