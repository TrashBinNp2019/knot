import * as db from '../general/postgres_client.js';
import * as engine from './engine.js';
import * as iface from './interface.js';
import { crawlerConfig as config } from '../general/config/config_singleton.js';
import { store } from './state/store.js';
import { parseLogs } from '../general/utils.js';

let eng:AsyncGenerator;

let prevState = store.getState();
store.subscribe(() => {
  const state = store.getState();
  if (state.general.message !== prevState.general.message && config().log_to_console) {
    console.log('-', parseLogs(state.general.message).msg);
  }
  if (state.pausable.resumePending && !prevState.pausable.resumePending) {
    eng.next();
  }

  prevState = store.getState();
});

db.test().then((err) => {
  if (err) {
    console.log('- DB error:', err.message);
    process.exit(1);
  }

  eng = engine.generate({ 
    db,
  });

  if (config().use_web_interface) {
    iface.init();
  }

  eng.next();
});
