import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";

export const Events = {
   log: 'log', 
   examined: 'examined',
   valid: 'valid',
}

export function init(port:number) {
  let examined_total = 0;
  let valid_total = 0;
  let examined_prev = new Date();
  let valid_prev = new Date();
  let examined_pm = 0;
  let valid_pm = 0;

  const app = express();

  app.use(express.static('src/crawler/static'));

  const httpServer = createServer(app);
  const io = new Server(httpServer);
  
  io.on("connection", (socket) => {
    socket.emit(Events.examined, examined_total);
    socket.emit(Events.valid, valid_total);
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
        valid_pm = calculatePerMinute(valid_prev, valid_pm, args[0]);
        valid_total += args[0];
        valid_prev = new Date();
        io.emit('valid', valid_total, valid_pm);
        return;
      }
    }

    throw new Error('Unknown event: ' + event);
  }

  httpServer.listen(port);
  return emit;
}

function calculatePerMinute(prev:Date, prevRate:number, count:number) {
  const now = new Date();
  let diff = now.getTime() - prev.getTime();
  if (diff < 5) {
    diff = 5
  }
  // console.log(prevRate, diff, count / diff * 1000 * 60, (prevRate * 100 + (count / (diff / 1000 / 60))) / 101);
  if (prevRate === 0) {
    return count / diff * 1000 * 60;
  } else {
    return (prevRate * 10 + (count / (diff / 1000 / 60))) / 11;
  }
}