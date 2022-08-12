/**
* If arg is defined, call the callback with arg.
* @param arg Value to check
* @param callback If defined called with arg
*/
export function ifDefined<T>(arg:T | undefined, callback: (arg:T) => void) {
  if (arg !== undefined) {
    callback(arg);
  }
}

/**
* Attempts to convert arg to ms. 
* Accepted inputs: number, \d+ms, \d+s, \d+m, \d+h, \d+d. 
* @example parseTime('1000ms') => 1000
* @param val Value to parse
* @returns Parsed milliseconds, undefined if invalid
*/
export function parseTime(val:any): number | undefined {
  switch (typeof val) {
    case ('number') : {
      return val;
    } 
    
    case ('string'): {
      return parseTimeString(val);
    }
  }
  
  return undefined;
}

function parseTimeString(val:string): number | undefined {
  let match = val.match(/^(\d+)(ms|[mshd])$/);
  
  if (match) {
    let [, num, unit] = match;
    switch (unit) {
      case 'm': return parseInt(num) * 60 * 1000;
      case 'h': return parseInt(num) * 60 * 60 * 1000;
      case 'd': return parseInt(num) * 24 * 60 * 60 * 1000;
      case 's': return parseInt(num) * 1000;
      case 'ms': return parseInt(num);
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
export function toAbsolute(hl:string, base:string):string | undefined {
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
      let ind = base.search(/[^:\/]\//) + 1;
      res = base.substring(0, !ind? length : ind) + hl;
      break;
    case /^?/.test(hl):
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
export function generateIps(count:number):string[] {
  return Array(count).fill(0).map(() => 
    (String(Math.floor(Math.random() * 255)) + '.').repeat(4).slice(0, -1)
  );
}