import * as toolkitRaw from '@reduxjs/toolkit';
const { createSlice } = ((toolkitRaw as any).default) as typeof toolkitRaw;
import { calculatePerMinute, stringifyLogs } from '../../general/utils.js';


let update_pm = calculatePerMinute;

const generalStatsSlice = createSlice({
  name: 'server',
  initialState: {
    examined_total: 0,
    valid_total: 0,
    examined_prev: Number(new Date()),
    examined_pm: 0,
    message: '',
  },
  reducers: {
    valid(state, action) {
      state.valid_total += action.payload.count;
    },
    examined(state, action) {
      const { rate, update } = update_pm(action.payload.count, Date.now() -  state.examined_prev);
      state.examined_total += action.payload.count;
      state.examined_pm = rate;
      update_pm = update;
      state.examined_prev = Date.now();
    },
    resetTime(state, action) {
      state.examined_prev = Date.now();
    },
    log(state, action) {
      state.message = stringifyLogs(Number(new Date()), ...action.payload);
    },
  }
})

export const { valid, examined, resetTime, log } = generalStatsSlice.actions;
export default generalStatsSlice.reducer;