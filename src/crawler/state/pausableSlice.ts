import * as toolkitRaw from '@reduxjs/toolkit';
const { createSlice } = ((toolkitRaw as any).default ?? toolkitRaw) as typeof toolkitRaw;

const pausableSlice = createSlice({
  name: 'pausable',
  initialState: {
    paused: false,
    pausePending: false,
    resumePending: false,
  },
  reducers: {
    pauseRequested(state, action) {
      if (!state.paused) {
        state.pausePending = true;
      }
      state.resumePending = false;
    },
    resumeRequested(state, action) {
      if (state.paused) {
        state.resumePending = true;
      }
      state.pausePending = false;
    },
    paused(state, action) {
      state.paused = true;
      state.pausePending = false;
      state.resumePending = false;
    },
    resumed(state, action) {
      state.paused = false;
      state.pausePending = false;
      state.resumePending = false;
    },
  }
})

export const { pauseRequested, paused, resumed, resumeRequested } = pausableSlice.actions;
export default pausableSlice.reducer;
