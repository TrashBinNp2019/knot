import * as db from '../general/postgres_client.js';
import * as engine from './engine.js';
import * as iface from './interface.js';

const emit = iface.init(8080);
db.test().then((err) => {
  if (err) {
    console.log('- DB error:', err.message);
    process.exit(1);
  }
  
  engine.on('log', (...args:any[]) => {
    emit(iface.Events.log, ...args);
  });
  engine.on('examined', (count:number) => {
    emit(iface.Events.examined, count);
  });
  engine.on('valid', (count) => {
    emit(iface.Events.valid, count);
  });

  engine.crawl([], db, -1).then(() => {
  }).catch(err => {
    console.log(err);
  });
});
