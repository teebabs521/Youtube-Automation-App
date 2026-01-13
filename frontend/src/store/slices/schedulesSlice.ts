import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Schedule {
  id: number;
  schedule_type: 'daily' | 'weekly' | 'custom';
  schedule_time: string;
  max_videos_per_day: number;
  timezone: string;
  is_active: boolean;
}

interface SchedulesState {
  schedules: Schedule[];
  loading: boolean;
  error: string | null;
}

const initialState: SchedulesState = {
  schedules: [],
  loading: false,
  error: null,
};

const schedulesSlice = createSlice({
  name: 'schedules',
  initialState,
  reducers: {
    setSchedules: (state, action: PayloadAction<Schedule[]>) => {
      state.schedules = action.payload;
    },
    addSchedule: (state, action: PayloadAction<Schedule>) => {
      state.schedules.push(action.payload);
    },
    updateSchedule: (state, action: PayloadAction<Schedule>) => {
      const index = state.schedules.findIndex((s) => s.id === action.payload.id);
      if (index !== -1) {
        state.schedules[index] = action.payload;
      }
    },
    removeSchedule: (state, action: PayloadAction<number>) => {
      state.schedules = state.schedules.filter((s) => s.id !== action.payload);
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const { setSchedules, addSchedule, updateSchedule, removeSchedule, setLoading, setError } = schedulesSlice.actions;
export default schedulesSlice.reducer;
