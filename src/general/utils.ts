import { promises as dns } from 'dns';

const IPv4 = /((1?\d{1,2}|2[0-4]\d|25[0-5])\.){3}(1?\d{1,2}|2[0-4]\d|25[0-5])/;

/**
 * If arg is defined call the callback with arg, but curried
 */
export function ifDefined<T>(callback: (arg: T) => any) {
  return (arg: T | undefined) => { 
    if (arg !== undefined) {
      return callback(arg) 
    }

    return undefined;
  };
}

/**
 * Attempts to convert arg to ms. 
 * Accepted inputs: number, \d+ms, \d+s, \d+m, \d+h, \d+d. 
 * @example parseTime('1000ms') => 1000
 * @param val Value to parse
 * @returns Parsed milliseconds, undefined if invalid
 */
export function parseTime(val: any): number | undefined {
  switch (typeof val) {
    case ('number') :
      return val;

    case ('string'):
      return parseTimeString(val);
  }
  
  return undefined;
}

async function reverseAddr(source: string) {
  let match = source.match(IPv4);
  if (match && match[0]) {
    try {
      let host = await dns.reverse(match[0]);
      if (host.length === 1) {
        return 'https://' + host[0];
      }
    } catch (e) { }
  }
  return source;
}

// TODO add suport for "1m 30s"
export function parseTimeString(val: string): number | undefined {
  let match = val.match(/^(\d+)(ms|[mshd])$/);
  
  if (match) {
    const [, num, unit] = match;
    switch (unit) {
      case 'm': return parseInt(num, 10) * 60 * 1000;
      case 'h': return parseInt(num, 10) * 60 * 60 * 1000;
      case 'd': return parseInt(num, 10) * 24 * 60 * 60 * 1000;
      case 's': return parseInt(num, 10) * 1000;
      case 'ms': return parseInt(num, 10);
    }
  }

  return undefined;
}

/**
 * Reduces args to a string via JSON.stringify. 
 * If the only arg is an object, it will be stringified with tabulation.
 * @param args Objects to convert
 * @returns String representation of args
 */
export function reduce(...args: any): string {
  if (args.length > 1) {
    return args.reduce((acc, arg) => {
      return '' +
        (typeof acc === 'string' ? acc : JSON.stringify(acc)) + ' ' +
        (typeof arg === 'string' ? arg : JSON.stringify(arg));
    });
  } else {
    return typeof args[0] === 'string' ? args[0] : JSON.stringify(args[0], null, 2);
  }
}

/**
 * Resolves hyperlink relative to the base url. Ignores #.
 * @example resolve('/foo/bar', 'http://example.com') => 'http://example.com/foo/bar'
 * @param hl Hyperlink to resolve
 * @param base Base URL to append to
 * @returns Combination of base and url or undefined if it's equal to base
 */
export function toAbsolute(hl: string, base: string): string | undefined {
  let res = '';

  switch (true) {
    case /^#/.test(hl):
    case /^\s*$/.test(hl):
    case hl === base:
      return undefined;
    case /https?:\/\//.test(hl):
      res = hl; 
      break;
    case /^\//.test(hl):  
      const ind = base.search(/[^:\/]\//) + 1;
      res = base.substring(0, !ind? base.length : ind) + hl;
      break;
    case /^\?/.test(hl):
      res = base.split('?')[0].split('#')[0] + hl;
      if (!/[^:\/]\//.test(res)) {
        res = res.replace(/([^\/])\?/, '$1/?');
      }
      break;
    case !/[^:\/]\//.test(base):
      res = base + '/' + hl;
      break;
    default:
      res = base.slice(0, base.lastIndexOf('/') + 1) + hl;
  }

  return res === base? undefined : res;
}

/**
 * Generate random IP addresses without any validity checks.
 * @param count Number of IP addresses to generate
 * @returns IP addresses
 */
export function generateIps(count: number): string[] {
  return Array(count).fill(0).map(() => 
    Array(4).fill(0).map(() => String(Math.floor(Math.random() * 255))).join('.')
  );
}

// TODO improve this to 1) ignore small differences and 2) use a rolling average
export function calculatePerMinute(diff: number, count: number) {
  let rate = count / Math.max(diff, 10) * 1000 * 60;
  return { 
    rate,
    update: (diff:number, count:number) => updatePerMinute(diff, rate, count),
  }
}

export function updatePerMinute(timeDiff: number, prevRate: number, count: number) {
  let diff = Math.max(timeDiff, 10);
  let rate = prevRate? (prevRate * 4 + (count / (diff / 1000 / 60))) / 5 : count / diff * 1000 * 60;
  return {
    rate,
    update: (diff: number, count: number) => updatePerMinute(diff, rate, count),
  }
}

export function stringifyLogs(time:number, ...args: any): string {
  return time + ';' + reduce(...args);
}

export function parseLogs(log: string): { time:number, msg:string } {
  const [ time, ...rest ] = log.split(';');
  let msg = rest.join(';');
  return { time: Number(time), msg };
}
