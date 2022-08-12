import * as toolkitRaw from '@reduxjs/toolkit';
const { createSlice } = ((toolkitRaw as any).default ?? toolkitRaw) as typeof toolkitRaw;

const pausableSlice = createSlice({
  name: 'pausable',
  initialState: {
    paused: false,
    pausePending: false,
  },
  reducers: {
    pauseRequested(state, action) {
      if (!state.paused) {
        state.pausePending = true;
      }
    },
    paused(state, action) {
      state.paused = true;
      state.pausePending = false;
    },
    resumed(state, action) {
      state.paused = false;
      state.pausePending = false;
    },
  }
})

export const { pauseRequested, paused, resumed } = pausableSlice.actions
export default pausableSlice.reducer
