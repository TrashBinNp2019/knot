import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { crawlerConfig as config } from "../general/config/config_singleton";

export const Events = {
   log: 'log', 
   examined: 'examined',
   valid: 'valid',
   cap: 'cap',
   pause: 'pause',
}

export function init(state:() => { paused:boolean }) {
  let examined_total = 0;
  let valid_total = 0;
  let examined_prev = new Date();
  let examined_pm = 0;

  const app = express();

  app.use(express.static((process.env.NODE_ENV === 'dev'? 'src' : 'build') + '/crawler/static'));
  app.use('/scripts', express.static(process.env.NODE_ENV === 'dev'? 'src/general' : 'build/general/public'));

  const httpServer = createServer(app);
  const io = new Server(httpServer);
  const callbacks = new Map<string, ((...args:any) => void)[]>();

  const on = (event:string, listener:(...args:any) => void) => {
    if (!Events[event]) {
      throw new Error('Unknown event: ' + event);
    }

    callbacks.set(event, callbacks.get(event) || []);
    callbacks.get(event).push(listener);
  }
  
  io.on("connection", (socket) => {
    socket.emit(Events.examined, examined_total, examined_pm);
    socket.emit(Events.valid, valid_total);
    socket.emit(Events.cap, config.targets_cap);
    socket.emit(Events.pause, state().paused);

    socket.on('cap', (count) => {
      count = parseInt(count) || config.targets_cap;
      config.targets_cap = count > 50000 ? 50000 : count
      io.emit(Events.cap, config.targets_cap);
    });

    socket.on('pause', () => {
      examined_prev = new Date();      
    });

    for (const key in Events) {
      socket.on(key, (...args:any[]) => {
        if (callbacks.get(key) !== undefined) {
          callbacks.get(key).forEach(fun => fun(...args));
        }
      });
    }
  });

  const emit = (event:string, ...args:any[]) => {
    switch (event) {
      case Events.log: {
        let message: string;
        if (args.length > 1) {
          message = args.reduce((acc, arg) => {
            return '' +
              (typeof acc === 'string'? acc : JSON.stringify(acc)) + ' ' + 
              (typeof arg === 'string'? arg : JSON.stringify(arg));
          });
        } else {
          message = typeof args[0] === 'string'? args[0] : JSON.stringify(args[0]);
        }
        io.emit('log', message);
        return;
      }
      case Events.examined: {
        examined_pm = calculatePerMinute(examined_prev, examined_pm, args[0]);
        examined_total += args[0];
        examined_prev = new Date();
        io.emit('examined', examined_total, examined_pm);
        return;
      }
      case Events.valid: {
        valid_total += args[0];
        io.emit('valid', valid_total);
        return;
      }
      case Events.cap: {
        io.emit('cap', args[0]);
        return;
      }
      case Events.pause: {
        io.emit('pause', args[0]);
        return;
      }
    }

    throw new Error('Unknown event: ' + event);
  }

  httpServer.listen(config.web_interface_port);
  return { emit, on };
}

// TODO improve this to 1) ignore small differences and 2) use a rolling average
function calculatePerMinute(prev:Date, prevRate:number, count:number) {
  const now = new Date();
  let diff = now.getTime() - prev.getTime();
  if (diff < 10) {
    diff = 10
  }
  // console.log(prevRate, diff, count / diff * 1000 * 60, (prevRate * 100 + (count / (diff / 1000 / 60))) / 101);
  if (prevRate === 0) {
    return count / diff * 1000 * 60;
  } else {
    return (prevRate * 10 + (count / (diff / 1000 / 60))) / 11;
  }
}