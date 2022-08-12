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
  },
  reducers: {
    valid(state, action) {
      state.valid_total += 1;
    },
    examined(state, action) {
      state.examined_total += action.payload;
      state.examined_pm = calculatePerMinute(state.examined_prev, state.examined_pm, action.payload);
      state.examined_prev = Number(new Date());
    },
    resetTime(state, action) {
      state.examined_prev = Number(new Date());
    }
  }
})

export const { valid, examined, resetTime } = generalStatsSlice.actions;
export default generalStatsSlice.reducer;