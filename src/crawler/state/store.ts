import * as toolkitRaw from '@reduxjs/toolkit';
const { configureStore } = ((toolkitRaw as any).default ?? toolkitRaw) as typeof toolkitRaw;
import pausableReducer from './pausableSlice.js';
import generalStatsReducer from './generalStatsSlice.js';
import targetsReducer from './targetsSlice.js';

export const store = configureStore({
  reducer: {
    pausable: pausableReducer,
    general: generalStatsReducer,
    targets: targetsReducer,
  }
});