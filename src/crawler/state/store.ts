import * as toolkitRaw from '@reduxjs/toolkit';
const { configureStore } = ((toolkitRaw as any).default) as typeof toolkitRaw;
import pausableReducer from './pausableSlice.js';
import generalStatsReducer from './generalStatsSlice.js';

export const store = configureStore({
  reducer: {
    pausable: pausableReducer,
    general: generalStatsReducer,
  }
});