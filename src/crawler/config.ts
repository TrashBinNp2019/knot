import * as fs from 'fs';

let TIMEOUT = 3000;
let TARGETS_CAP = 5000;
let USE_WEB_IFACE = true;
let IFACE_PORT = 8081;
let UNSAFE = false;
let LOG_TO_CONSOLE = true;

read();

export function read() {
  if (!fs.existsSync('config/crawler-config.json')) {
    fs.writeFileSync('config/crawler-config.json', JSON.stringify({}));
  };

  const config = JSON.parse(fs.readFileSync('config/crawler-config.json', 'utf8'));
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
  
  TIMEOUT = ms ?? 3000;
  TARGETS_CAP = config.targets_cap ?? 5000;
  USE_WEB_IFACE = config.use_web_interface ?? true;
  IFACE_PORT = config.web_interface_port ?? 8081;
  UNSAFE = config.unsafe ?? false;
  LOG_TO_CONSOLE = config.log_to_console ?? true;
}

export function write() {
  let config = {
    request_timeout: TIMEOUT + 'ms',
    targets_cap: TARGETS_CAP,
    use_web_interface: USE_WEB_IFACE,
    web_interface_port: IFACE_PORT,
    unsafe: UNSAFE,
    log_to_console: LOG_TO_CONSOLE,
  };
  fs.writeFileSync('config/crawler-config.json', JSON.stringify(config, null, 2));
}

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

export function logToConsole(flag?:boolean) {
  if (flag !== undefined) {
    LOG_TO_CONSOLE = flag;
  }
  return LOG_TO_CONSOLE;
}