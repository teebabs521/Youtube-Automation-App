import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Channel {
  id: number;
  channel_id: string;
  channel_name: string;
  subscriber_count?: number;
  video_count?: number;
}

interface ChannelsState {
  channels: Channel[];
  loading: boolean;
  error: string | null;
}

const initialState: ChannelsState = {
  channels: [],
  loading: false,
  error: null,
};

const channelsSlice = createSlice({
  name: 'channels',
  initialState,
  reducers: {
    setChannels: (state, action: PayloadAction<Channel[]>) => {
      state.channels = action.payload;
    },
    addChannel: (state, action: PayloadAction<Channel>) => {
      state.channels.push(action.payload);
    },
    removeChannel: (state, action: PayloadAction<number>) => {
      state.channels = state.channels.filter((ch) => ch.id !== action.payload);
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const { setChannels, addChannel, removeChannel, setLoading, setError } = channelsSlice.actions;
export default channelsSlice.reducer;
