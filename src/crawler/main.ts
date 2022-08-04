import * as db from '../general/postgres_client.js';
import * as engine from './engine.js';
import * as iface from './interface.js';
import * as config from './config.js';

db.test().then((err) => {
  if (err) {
    console.log('- DB error:', err.message);
    process.exit(1);
  }

  if (config.useWebIface()) {
    const server = iface.init();

    engine.on('log', (...args:any[]) => {
      server.emit(iface.Events.log, ...args);
    });
    engine.on('examined', (count:number) => {
      server.emit(iface.Events.examined, count);
    });
    engine.on('valid', (count) => {
      server.emit(iface.Events.valid, count);
    });
  }

  engine.crawl([], db, -1).then(() => {
  }).catch(err => {
    console.log(err);
  });
});
