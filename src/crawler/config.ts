import * as fs from 'fs';

const config = JSON.parse(fs.readFileSync('./config/crawler-config.json', 'utf8'));
let ms:number;
if (config.request_timeout !== undefined) {
  let set = false;
  if (typeof(config.request_timeout) === 'number') {
    if (ms >= 100) {
      ms = config.request_timeout;
      set = true;
    } else {
      ms = config.request_timeout * 1000;
      set = true;
    }
  } 
  
  if (typeof(config.request_timeout) === 'string') {
    if (/^\d+ms$/.test(config.request_timeout)) {
      ms = parseInt(config.request_timeout.substring(0, config.request_timeout.length - 2));       
      set = true;
    } 
    if (/^\d+s$/.test(config.request_timeout)) {
      ms = parseInt(config.request_timeout.substring(0, config.request_timeout.length - 1)) * 1000;       
      set = true;
    }
  }
  
  if (!set) {
    console.log('- Invalid request_timeout');
  }
}

let TIMEOUT = ms ?? 3000;
let TARGETS_CAP = config.targets_cap ?? 5000;
let USE_WEB_IFACE = config.use_web_interface ?? true;
let IFACE_PORT = config.web_interface_port ?? 8081;
let UNSAFE = config.unsafe ?? false;

export function timeout(ms?:number) {
  if (ms !== undefined) {
    TIMEOUT = ms;
  }
  return TIMEOUT;
}

export function targetsCap(cap?:number) {
  if (cap !== undefined) {
    TARGETS_CAP = cap;
  }
  return TARGETS_CAP;
}

export function ifacePort(port?:number) {
  if (port !== undefined) {
    IFACE_PORT = port;
  }
  return IFACE_PORT;
}

export function useWebIface(flag?:boolean) {
  if (flag !== undefined) {
    USE_WEB_IFACE = flag;
  }
  return USE_WEB_IFACE;
}

export function unsafe(flag?:boolean) {
  if (flag !== undefined) {
    UNSAFE = flag;
  }
  return UNSAFE;
}