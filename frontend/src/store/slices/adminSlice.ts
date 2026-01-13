import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AdminUser {
  id: number;
  email: string;
  name: string;
  role: string;
  created_at: string;
}

interface AdminStats {
  totalUsers: number;
  totalVideos: number;
  postedVideos: number;
}

interface AdminState {
  users: AdminUser[];
  stats: AdminStats;
  loading: boolean;
  error: string | null;
}

const initialState: AdminState = {
  users: [],
  stats: { totalUsers: 0, totalVideos: 0, postedVideos: 0 },
  loading: false,
  error: null,
};

const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {
    setUsers: (state, action: PayloadAction<AdminUser[]>) => {
      state.users = action.payload;
    },
    setStats: (state, action: PayloadAction<AdminStats>) => {
      state.stats = action.payload;
    },
    removeUser: (state, action: PayloadAction<number>) => {
      state.users = state.users.filter((u) => u.id !== action.payload);
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const { setUsers, setStats, removeUser, setLoading, setError } = adminSlice.actions;
export default adminSlice.reducer;
