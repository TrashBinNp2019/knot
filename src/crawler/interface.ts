import express from "express";
import { createServer } from "http";
import { Server, Socket } from "socket.io";
import { crawlerConfig as config } from "../general/config/config_singleton.js";
import { store } from "./state/store.js";
import * as pausable from "./state/pausableSlice.js";

export const Events = {
  log: 'log', 
  examined: 'examined',
  valid: 'valid',
  cap: 'cap',
  pause: 'pause',
}

class ServerWrapper {
  private prevState;
  
  constructor(io: Server) {
    this.prevState = store.getState();
    
    store.subscribe(() => {
      const state = store.getState();
      let args: [string, ...any];
      
      switch (true) {
        case (state.general.message !== this.prevState.general.message) :
          args = [Events.log, state.general.message];
          break;
        case (state.general.examined_total !== this.prevState.general.examined_total) :
          args = [Events.examined, state.general.examined_total, state.general.examined_pm];
          break;
        case (state.general.valid_total !== this.prevState.general.valid_total) :
          args = [Events.valid, state.general.valid_total];
          break;
        case (state.pausable.paused !== this.prevState.pausable.paused) :
          args = [Events.pause, state.pausable.paused];
          break;
      }
      
      io.emit(...args);
      this.prevState = state;
    });
    
    io.on("connection", (socket) => {
      socket.emit(Events.examined, store.getState().general.examined_total, store.getState().general.examined_pm);
      socket.emit(Events.valid, store.getState().general.valid_total);
      socket.emit(Events.cap, config().targets_cap);
      socket.emit(Events.pause, store.getState().pausable.paused);
      
      socket.on(Events.cap, (count) => {
        count = parseInt(count, 10) || config().targets_cap;
        config().targets_cap = count > 50000 ? 50000 : count;
        io.emit(Events.cap, config().targets_cap);
      });
      
      socket.on(Events.pause, () => {
        if (store.getState().pausable.paused) {
          store.dispatch(pausable.resumeRequested({}));
        } else {
          store.dispatch(pausable.pauseRequested({}));
        }
      });
    });
  }
}

export function init() {
  return new ServerWrapper(new Server(startExpress()));
}

export function startExpress() {
  const app = express();
  
  app.use(express.static((process.env.NODE_ENV === 'dev' ? 'src' : 'build') + '/crawler/static'));
  app.use('/scripts', express.static(process.env.NODE_ENV === 'dev' ? 'src/general' : 'build/general/public'));
  
  const httpServer = createServer(app);
  httpServer.listen(config().web_interface_port);
  httpServer.unref();
  return httpServer;
}
