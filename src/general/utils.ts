/**
 * If arg is defined call the callback with arg, but curried
 * @param arg Value to check
 */
export function ifDefined<T>(arg: T | undefined) {
  if (arg !== undefined) {
    return (callback: (arg: T) => void) => { callback(arg) };
  } else {
    return () => {};
  }
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

function parseTimeString(val: string): number | undefined {
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
export function calculatePerMinute(prev: number, prevRate: number, count: number) {
  const curr = Number(new Date());
  let diff = Math.max(curr - prev, 10);
  // console.log(prevRate, diff, count / diff * 1000 * 60, (prevRate * 100 + (count / (diff / 1000 / 60))) / 101);
  if (prevRate === 0) {
    return count / diff * 1000 * 60;
  } else {
    return (prevRate * 10 + (count / (diff / 1000 / 60))) / 11;
  }
}
