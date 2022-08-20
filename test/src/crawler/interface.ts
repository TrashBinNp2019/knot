import * as tap from 'tap';
import { Server } from 'http';
import esmock from 'esmock';
import * as pausable from '../../../src/crawler/state/pausableSlice.js';

class ServerMock {
  on: (event: string, callback: (sock) => void) => void;
  emit: (...args: any[]) => void;
  
  constructor(http: Server) {
    this.on = (event: string, callback: (sock) => void) => {
      connect = (sock: { emit: (...args:any) => void, on: (ev: string, f: () => void) => void }) => callback(sock);
    };
    this.emit = (...args: any[]) => {
      emitted.push(args);
    };
  }
}
const iface = await esmock(
  '../../../src/crawler/interface.ts',
  {
    'socket.io': {
      Server: ServerMock,
    },
    '../../../src/general/config/config_singleton.ts': {
      crawlerConfig: () => (crwl),
    },
    '../../../src/crawler/state/store.ts': {
      store: {
        subscribe: (f: () => void) => {
          notify = f;
        },
        dispatch: (ev: any) => {
          dispatched.push(ev);
        },
        getState: () => ({
          general: g,
          pausable: p,
        }),
      }
    },
  }
);

// for server callbacks
let connect: (sock: { emit: (...args:any) => void, on: (ev: string, f: () => void) => void, }) => void;
let emitted: any[][] = [];
let dispatched: any[] = [];

// config
let crwl = {
  targets_cap: 5000,
  web_interface_port: 41973,
}

// state
let notify: () => void;
let p = {
  paused: false,
}
let g = {
  examined_total: 14,
  examined_pm: 2,
  valid_total: 3,
  message: 'hello',
}

tap.beforeEach(() => {
  dispatched = [];
  emitted = [];
});

tap.test('Start express', async t => {
  let serv: Server = iface.startExpress();
  serv.address
  t.match(serv.address(), {
    port: 41973,
  });
  serv.close();
});

tap.test('Server wrapping', async t => {
  g = {
    examined_total: 14,
    examined_pm: 2,
    valid_total: 3,
    message: 'hello',
  }
  let serv = new iface.ServerWrapper(new ServerMock(new Server()));
  t.same(emitted, []);

  g = Object.assign({}, g, {
    examined_total: 15,
  });
  notify();
  t.same(emitted, [[iface.Events.examined, 15, 2]]);
  emitted = [];

  g = Object.assign({}, g, {
    valid_total: 4
  });
  notify();
  t.same(emitted, [[iface.Events.valid, 4]]);
  emitted = [];

  g = Object.assign({}, g, {
    message: 'hi',
  });
  notify();
  t.same(emitted, [[iface.Events.log, 'hi']]);
  emitted = [];

  p = {
    paused: true,
  }
  notify();
  t.same(emitted, [[iface.Events.pause, true]]);
  emitted = [];
});

tap.test('Connection handling', async t => {
  g = {
    examined_total: 14,
    examined_pm: 2,
    valid_total: 3,
    message: 'hello',
  }
  p = {
    paused: false,
  }
  iface.init();

  let em:any[][] = [];
  let callbacks: Map<string, ((...args:any) => void)> = new Map();
  connect({
    emit: (...args:any) => {
      em.push(args);
    },
    on: (ev, f) => {
      callbacks.set(ev, f);
    },
  });

  t.same(em, [
    [iface.Events.examined, 14, 2],
    [iface.Events.valid, 3],
    [iface.Events.cap, 5000],
    [iface.Events.pause, false],
  ]);
  em = [];

  // cap emit is global, so it goes to emitted, not em, which belongs to the socket
  t.same(dispatched, []);
  t.same(emitted, []);
  t.ok(callbacks.has(iface.Events.cap));
  callbacks.get(iface.Events.cap)?.('500');
  t.same(emitted, [
    [iface.Events.cap, 500],
  ]);
  t.same(dispatched, []);
  emitted = [];

  t.ok(callbacks.has(iface.Events.cap));
  callbacks.get(iface.Events.cap)?.('invalid');
  t.same(emitted, [
    [iface.Events.cap, 500],
  ], 'invalid input shouldn\'t modify cap');
  emitted = [];

  t.ok(callbacks.has(iface.Events.cap));
  callbacks.get(iface.Events.cap)?.('50000000');
  t.same(emitted, [
    [iface.Events.cap, 50000],
  ], 'cap shouldn\'t exceed 50000');
  emitted = [];

  p.paused = false;
  t.ok(callbacks.has(iface.Events.pause));
  callbacks.get(iface.Events.pause)?.();
  t.same(dispatched, [
    pausable.pauseRequested({}),
  ]);
  dispatched = [];

  p.paused = true;
  callbacks.get(iface.Events.pause)?.();
  t.same(dispatched, [
    pausable.resumeRequested({}),
  ]);
});
