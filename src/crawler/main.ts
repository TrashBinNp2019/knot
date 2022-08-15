import * as db from '../general/postgres_client.js';
import * as engine from './engine.js';
import * as iface from './interface.js';
import { crawlerConfig as config } from '../general/config/config_singleton.js';
import { store } from './state/store.js';
import * as pausable from './state/pausableSlice.js';

db.test().then((err) => {
  if (err) {
    console.log('- DB error:', err.message);
    process.exit(1);
  }

  let en = engine.generate({ db });

  if (config().use_web_interface) {
    const server = iface.init();

    engine.on('log', (...args: any[]) => {
      server.emit(iface.Events.log, ...args);
    });
    engine.on('examined', (count: number) => {
      server.emit(iface.Events.examined, count);
    });
    engine.on('valid', (count) => {
      
      server.emit(iface.Events.valid, count);
    });
    engine.on('pause', () => {
      server.emit(iface.Events.pause);
    });

    server.on('pause', () => {
      if (!store.getState().pausable.paused) {
        store.dispatch(pausable.pauseRequested({}));
      } else {
        en.next();
      }
    });
  }

  en.next({ db });
});
