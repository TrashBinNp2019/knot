import * as db from '../general/postgres_client.js';
import * as engine from './engine.js';
import * as iface from './interface.js';
import * as config from './config.js';

let targets:string[] = [];

db.test().then((err) => {
  if (err) {
    console.log('- DB error:', err.message);
    process.exit(1);
  }

  if (config.useWebIface()) {
    const server = iface.init(() => ({
      paused: engine.isPaused(),
    }));

    engine.on('log', (...args:any[]) => {
      server.emit(iface.Events.log, ...args);
    });
    engine.on('examined', (count:number) => {
      server.emit(iface.Events.examined, count);
    });
    engine.on('valid', (count) => {
      server.emit(iface.Events.valid, count);
    });
    engine.on('pause', (paused:boolean) => {
      server.emit(iface.Events.pause, paused);
    });

    server.on('pause', () => {
      if (!engine.isPaused()) {
          engine.isPaused(true);
      } else {
        engine.start(db, targets).then((tgts) => {
          targets = tgts;
        }).catch(err => {
          console.log(err.message);
          process.exit(1);
        });
      }
    });
  }

  engine.start(db).then((tgts) => {
    targets = tgts;
  }).catch(err => {
    console.log(err.message);
    process.exit(1);
  });
});
