import express from "express";
import { createServer } from "http";
import { Server, Socket } from "socket.io";
import { crawlerConfig as config } from "../general/config/config_singleton";

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
  private examined_total: number;
  private valid_total: number;
  private examined_prev: Date;
  private examined_pm: number;
  private state: () => { paused:boolean };
  
  constructor(io:Server, state:() => { paused:boolean }) {
    this.callbacks = new Map<string, ((...args: any) => void)[]>();
    this.examined_total = 0;
    this.valid_total = 0;
    this.examined_prev = new Date();
    this.examined_pm = 0;
    this.state = state;
    
    io.on("connection", this.onNewConnection);
  }

  private onNewConnection(socket:Socket):void {
    socket.emit(Events.examined, this.examined_total, this.examined_pm);
    socket.emit(Events.valid, this.valid_total);
    socket.emit(Events.cap, config.targets_cap);
    socket.emit(Events.pause, this.state().paused);
    
    socket.on('cap', (count) => {
      count = parseInt(count) || config.targets_cap;
      config.targets_cap = count > 50000 ? 50000 : count
      this.io.emit(Events.cap, config.targets_cap);
    });
    
    socket.on('pause', () => {
      this.examined_prev = new Date();      
    });
    
    for (const key in Events) {
      socket.on(key, (...args:any[]) => {
        if (this.callbacks.get(key) !== undefined) {
          this.callbacks.get(key).forEach(fun => fun(...args));
        }
      });
    }
  }
  
  emit(event:string, ...args:any[]): void {
    let arg:any = args[0];
    
    switch (event) {
      case Events.log: 
        arg = reduce(args);
        break;
      case Events.valid:
        this.valid_total += args[0];
        break;
      case Events.examined:
        this.examined_pm = calculatePerMinute(this.examined_prev, this.examined_pm, args[0]);
        this.examined_total += args[0];
        this.examined_prev = new Date();
        arg = [this.examined_total, this.examined_pm];
      case Events.cap:
      case Events.pause:
        break;
      default:
        throw new Error('Unknown event: ' + event);
    }
    
    this.io.emit(event, ...arg);
  }
  
  on (event:string, listener:(...args:any) => void): void {
    if (!Events[event]) {
      throw new Error('Unknown event: ' + event);
    }
    
    this.callbacks.set(event, this.callbacks.get(event) || []);
    this.callbacks.get(event).push(listener);
  }
}

export function init(state:() => { paused:boolean }) {
  return new ServerWrapper(new Server(startHttpServer()), state);
}

function startHttpServer() {
  const app = express();
  
  app.use(express.static((process.env.NODE_ENV === 'dev' ? 'src' : 'build') + '/crawler/static'));
  app.use('/scripts', express.static(process.env.NODE_ENV === 'dev' ? 'src/general' : 'build/general/public'));
  
  const httpServer = createServer(app);
  httpServer.listen(config.web_interface_port);
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