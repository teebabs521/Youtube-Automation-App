import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Video {
  id: number;
  user_id: number;
  source_channel_id: number;
  video_id: string;
  title: string;
  description?: string;
  thumbnail_url?: string;
  duration?: number;
  status: 'pending' | 'scheduled' | 'posted' | 'failed';
  destination_channel_id?: string;
  scheduled_at?: string;
  posted_at?: string;
  view_count?: number;
  like_count?: number;
  comment_count?: number;
  tags?: string;
  created_at?: string;
  updated_at?: string;
}

interface VideosState {
  videos: Video[];
  loading: boolean;
  error: string | null;
  filter: 'all' | 'pending' | 'scheduled' | 'posted' | 'failed';
  selectedVideo: Video | null;
  dailyPostCount: number;
  dailyPostLimit: number;
}

const initialState: VideosState = {
  videos: [],
  loading: false,
  error: null,
  filter: 'all',
  selectedVideo: null,
  dailyPostCount: 0,
  dailyPostLimit: 5,
};

const videosSlice = createSlice({
  name: 'videos',
  initialState,
  reducers: {
    setVideos: (state, action: PayloadAction<Video[]>) => {
      state.videos = action.payload;
      
      // Calculate daily post count
      const today = new Date().toDateString();
      state.dailyPostCount = action.payload.filter(
        (v) => v.status === 'posted' && v.posted_at && new Date(v.posted_at).toDateString() === today
      ).length;
    },
    
    addVideo: (state, action: PayloadAction<Video>) => {
      state.videos.unshift(action.payload);
    },
    
    addVideos: (state, action: PayloadAction<Video[]>) => {
      // Add multiple videos, avoiding duplicates
      const existingIds = new Set(state.videos.map((v) => v.video_id));
      const newVideos = action.payload.filter((v) => !existingIds.has(v.video_id));
      state.videos = [...newVideos, ...state.videos];
    },
    
    updateVideo: (state, action: PayloadAction<Video>) => {
      const index = state.videos.findIndex((v) => v.id === action.payload.id);
      if (index !== -1) {
        state.videos[index] = action.payload;
      }
      
      // Recalculate daily post count
      const today = new Date().toDateString();
      state.dailyPostCount = state.videos.filter(
        (v) => v.status === 'posted' && v.posted_at && new Date(v.posted_at).toDateString() === today
      ).length;
    },
    
    updateVideoStatus: (state, action: PayloadAction<{ id: number; status: Video['status']; posted_at?: string }>) => {
      const index = state.videos.findIndex((v) => v.id === action.payload.id);
      if (index !== -1) {
        state.videos[index].status = action.payload.status;
        if (action.payload.posted_at) {
          state.videos[index].posted_at = action.payload.posted_at;
        }
      }
      
      // Recalculate daily post count
      const today = new Date().toDateString();
      state.dailyPostCount = state.videos.filter(
        (v) => v.status === 'posted' && v.posted_at && new Date(v.posted_at).toDateString() === today
      ).length;
    },
    
    removeVideo: (state, action: PayloadAction<number>) => {
      state.videos = state.videos.filter((v) => v.id !== action.payload);
    },
    
    setFilter: (state, action: PayloadAction<VideosState['filter']>) => {
      state.filter = action.payload;
    },
    
    setSelectedVideo: (state, action: PayloadAction<Video | null>) => {
      state.selectedVideo = action.payload;
    },
    
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    
    setDailyPostLimit: (state, action: PayloadAction<number>) => {
      state.dailyPostLimit = action.payload;
    },
    
    clearVideos: (state) => {
      state.videos = [];
      state.dailyPostCount = 0;
      state.selectedVideo = null;
      state.error = null;
    },
  },
});

// Selectors
export const selectAllVideos = (state: { videos: VideosState }) => state.videos.videos;

export const selectFilteredVideos = (state: { videos: VideosState }) => {
  const { videos, filter } = state.videos;
  if (filter === 'all') return videos;
  return videos.filter((v) => v.status === filter);
};

export const selectPendingVideos = (state: { videos: VideosState }) =>
  state.videos.videos.filter((v) => v.status === 'pending');

export const selectPostedVideos = (state: { videos: VideosState }) =>
  state.videos.videos.filter((v) => v.status === 'posted');

export const selectScheduledVideos = (state: { videos: VideosState }) =>
  state.videos.videos.filter((v) => v.status === 'scheduled');

export const selectDailyPostCount = (state: { videos: VideosState }) => state.videos.dailyPostCount;

export const selectDailyPostLimit = (state: { videos: VideosState }) => state.videos.dailyPostLimit;

export const selectCanPostToday = (state: { videos: VideosState }) =>
  state.videos.dailyPostCount < state.videos.dailyPostLimit;

export const selectRemainingPostsToday = (state: { videos: VideosState }) =>
  Math.max(0, state.videos.dailyPostLimit - state.videos.dailyPostCount);

export const selectVideoById = (state: { videos: VideosState }, videoId: number) =>
  state.videos.videos.find((v) => v.id === videoId);

export const selectVideosLoading = (state: { videos: VideosState }) => state.videos.loading;

export const selectVideosError = (state: { videos: VideosState }) => state.videos.error;

export const {
  setVideos,
  addVideo,
  addVideos,
  updateVideo,
  updateVideoStatus,
  removeVideo,
  setFilter,
  setSelectedVideo,
  setLoading,
  setError,
  setDailyPostLimit,
  clearVideos,
} = videosSlice.actions;

export default videosSlice.reducer;