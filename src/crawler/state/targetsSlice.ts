import * as toolkitRaw from '@reduxjs/toolkit';
const { createSlice } = ((toolkitRaw as any).default ?? toolkitRaw) as typeof toolkitRaw;
import { crawlerConfig as config } from '../../general/config/config_singleton.js';
import { generateIps } from '../../general/utils.js';

const targetsSlice = createSlice({
  name: 'targets',
  initialState: {
    curr: [],
    next: [],
  },
  reducers: {
    push(state, action) {
      if (state.next.length < config.targets_cap && !state.next.includes(action.payload)) {
        state.next.push(action.payload);
      }
    },
    shift(state, action) {
      let next = state.next;   
      if (next.length < config.targets_cap && config.generate_random_targets) {
        next = [...next, ...generateIps(config.targets_cap - next.length)];
      } else if (next.length !== config.targets_cap) {
        next = generateIps(config.targets_cap);
      }
      
      state.curr = next;
      state.next = [];
    },
    clear(state, action) {
      state.curr = [];
      state.next = [];
    }
  }
})

export const { push, shift, clear } = targetsSlice.actions;
export default targetsSlice.reducer;
