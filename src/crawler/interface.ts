import express from "express";
import { createServer } from "http";
import { Server, Socket } from "socket.io";
import { crawlerConfig as config } from "../general/config/config_singleton.js";
import { store } from "./state/store.js";
import * as pausable from "./state/pausableSlice.js";
import * as general from "./state/generalStatsSlice.js";

export const Events = {
  log: 'log', 
  examined: 'examined',
  valid: 'valid',
  cap: 'cap',
  pause: 'pause',
}

class ServerWrapper {
  private io: Server;  
  private callbacks: Map<string, ((...args: any) => void)[]>;
  
  constructor(io: Server) {
    this.callbacks = new Map<string, ((...args: any) => void)[]>();
    this.io = io;
    
    io.on("connection", this.onNewConnection);
  }

  private onNewConnection(socket: Socket): void {
    socket.emit(Events.examined, store.getState().general.examined_total, store.getState().general.examined_pm);
    socket.emit(Events.valid, store.getState().general.valid_total);
    socket.emit(Events.cap, config().targets_cap);
    socket.emit(Events.pause, store.getState().pausable.paused);
    
    socket.on('cap', (count) => {
      count = parseInt(count, 10) || config().targets_cap;
      config().targets_cap = count > 50000 ? 50000 : count;
      this.io.emit(Events.cap, config().targets_cap);
    });
    
    socket.on('pause', () => {
      store.dispatch(pausable.pauseRequested({}));
    });
    
    for (const key in Events) {
      socket.on(key, (...args: any[]) => {
        if (this.callbacks.get(key) !== undefined) {
          this.callbacks.get(key).forEach(fun => fun(...args));
        }
      });
    }
  }
  
  emit(event: string, ...args: any[]): void {
    let arg: any = args.slice(0, 1);
    
    switch (event) {
      case Events.examined:
        arg = [store.getState().general.examined_total, store.getState().general.examined_pm];
        break;
      case Events.log: 
        arg = [reduce(args)];
      case Events.valid:
      case Events.cap:
      case Events.pause:
        break;
      default:
        throw new Error('Unknown event: ' + event);
    }
    
    this.io.emit(event, ...arg);
  }
  
  on (event: string, listener: (...args: any) => void): void {
    if (!Events[event]) {
      throw new Error('Unknown event: ' + event);
    }
    
    this.callbacks.set(event, this.callbacks.get(event) || []);
    this.callbacks.get(event).push(listener);
  }
}

export function init() {
  return new ServerWrapper(new Server(startHttpServer()));
}

function startHttpServer() {
  const app = express();
  
  app.use(express.static((process.env.NODE_ENV === 'dev' ? 'src' : 'build') + '/crawler/static'));
  app.use('/scripts', express.static(process.env.NODE_ENV === 'dev' ? 'src/general' : 'build/general/public'));
  
  const httpServer = createServer(app);
  httpServer.listen(config().web_interface_port);
  return httpServer;
}

/**
 * Reduces args to a string via JSON.stringify.
 * @param args Objects to convert
 * @returns String representation of args
 */
function reduce(args: any[]) {
  let message: string;
  if (args.length > 1) {
    message = args.reduce((acc, arg) => {
      return '' +
      (typeof acc === 'string' ? acc : JSON.stringify(acc)) + ' ' +
      (typeof arg === 'string' ? arg : JSON.stringify(arg));
    });
  } else {
    message = typeof args[0] === 'string' ? args[0] : JSON.stringify(args[0]);
  }
  return message;
}
