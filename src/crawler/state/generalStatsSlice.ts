import * as toolkitRaw from '@reduxjs/toolkit';
const { createSlice } = ((toolkitRaw as any).default ?? toolkitRaw) as typeof toolkitRaw;
import { calculatePerMinute } from '../../general/utils.js';

const generalStatsSlice = createSlice({
  name: 'server',
  initialState: {
    examined_total: 0,
    valid_total: 0,
    examined_prev: Number(new Date()),
    examined_pm: 0,
    update_pm: calculatePerMinute
  },
  reducers: {
    valid(state, action) {
      state.valid_total += 1;
    },
    examined(state, action) {
      const { rate, update } = state.update_pm(state.examined_prev - Number(new Date()), action.payload);
      state.examined_total += action.payload;
      state.examined_pm = rate;
      state.update_pm = update;
      state.examined_prev = Number(new Date());
    },
    resetTime(state, action) {
      state.examined_prev = Number(new Date());
    }
  }
})

export const { valid, examined, resetTime } = generalStatsSlice.actions;
export default generalStatsSlice.reducer;