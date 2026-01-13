import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Video {
  id: number;
  video_id: string;
  title: string;
  description: string;
  status: 'pending' | 'scheduled' | 'posted' | 'failed';
  source_channel_id: number;
  thumbnail?: string;
  posted_at?: string;
}

interface VideosState {
  videos: Video[];
  loading: boolean;
  error: string | null;
  filter: string;
}

const initialState: VideosState = {
  videos: [],
  loading: false,
  error: null,
  filter: 'all',
};

const videosSlice = createSlice({
  name: 'videos',
  initialState,
  reducers: {
    setVideos: (state, action: PayloadAction<Video[]>) => {
      state.videos = action.payload;
    },
    addVideo: (state, action: PayloadAction<Video>) => {
      state.videos.unshift(action.payload);
    },
    updateVideo: (state, action: PayloadAction<Video>) => {
      const index = state.videos.findIndex((v) => v.id === action.payload.id);
      if (index !== -1) {
        state.videos[index] = action.payload;
      }
    },
    removeVideo: (state, action: PayloadAction<number>) => {
      state.videos = state.videos.filter((v) => v.id !== action.payload);
    },
    setFilter: (state, action: PayloadAction<string>) => {
      state.filter = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const { setVideos, addVideo, updateVideo, removeVideo, setFilter, setLoading, setError } = videosSlice.actions;
export default videosSlice.reducer;
