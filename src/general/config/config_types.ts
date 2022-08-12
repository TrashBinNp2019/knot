import * as fs from 'fs';

// Interfaces dosn't work smh :/
class Readable {
  public static read(path:string): Readable {
    ensureExists('config/crawler-config.json');
    return ensureValid(fs.readFileSync('config/crawler-config.json', 'utf8'));
  };
}

class Writable {
  write(path:string) {
    fs.writeFileSync(path, JSON.stringify(this.writeExcluded(), null, 2));
  };

  writeExcluded(): any {
    let {write, ...data} = this;
    return data;
  }
}

export class CrawlerConfig extends Writable implements Readable {
  public request_timeout: number;
  public targets_cap: number;
  public use_web_interface: boolean;
  public web_interface_port: number;
  public unsafe: boolean;
  public log_to_console: boolean;
  
  constructor(data:any) {
    super();
    this.request_timeout = parseTime(data.request_timeout) ?? 5000;
    this.targets_cap = parseInt(data.targets_cap) || 1000;
    this.use_web_interface = data.use_web_interface ?? true;
    this.web_interface_port = parseInt(data.web_interface_port) || 8080;
    this.unsafe = data.unsafe ?? false;
    this.log_to_console = data.log_to_console ?? true;
  }
  
  public static read(): CrawlerConfig {
    return new CrawlerConfig(Readable.read('config/crawler-config.json'));
  }
  
  write(): void {
    super.write('config/crawler-config.json');
  }
}

export class PageConfig extends Writable implements Readable {
  public port: number; 
  
  constructor(data:any) {
    super();
    this.port = parseInt(data.port) || 8080;
  }
  
  public static read(): PageConfig {
    return new PageConfig(Readable.read('config/page-config.json'));    
  }
  
  write(): void {
    super.write('config/page-config.json');
  }
}

export class PostgresConfig extends Writable implements Readable {
  public user: string;
  public password: string;
  public host: string;
  public port: number;
  public database: string;
  
  constructor(data:any) {
    super();
    if (!allDefined(data, ['user, password, database']) || !allStrings(data, ['user, password, database'])) {
      throw new Error('Invalid postgres config');
    }
    this.user = data.user;
    this.password = data.password;
    this.host = data.host ?? 'localhost';
    this.port = parseInt(data.port) ?? 5432;
    this.database = data.database;
  }
  
  public static read(): PostgresConfig {
    return new PostgresConfig(Readable.read('config/postgres-config.json'));
  }
  
  write(): void {
    super.write('config/postgres-config.json');
  }
}

function ensureExists(path:string) {
  if (!fs.existsSync(path)) {
    fs.writeFileSync(path, '{\n}');
  }
}

function ensureValid(data:string) {
  try {
    return JSON.parse(data);
  } catch(e) {
    console.log('- Config error:', e.message);
    return {};
  }
}

function allDefined(obj:any, keys:string[]) {
  for (let key of keys) {
    if (obj[key] === undefined) {
      console.log(`- ${key} undefined!`);
      return false;
    }
  }
  return true;
}

function allStrings(obj:any, keys:string[]) {
  for (let key of keys) {
    if (typeof obj[key] !== 'string') {
      console.log(`- ${key} not a string!`);
      return false;
    }
  }
  return true;
}

// TODO test this!
/**
* Attempts to convert arg to ms. 
* Accepted inputs: number, \d+ms, \d+s, \d+m, \d+h, \d+d. 
* @example parseTime('1000ms') => 1000
* @param val Value to parse
* @returns Parsed milliseconds, undefined if invalid
*/
function parseTime(val:any): number | undefined {
  switch (typeof val) {
    case ('number') : {
      return val;
    } 
    
    case ('string'): {
      let match = val.match(/^(\d+)([mshd])$/);
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
    }
  }
  
  console.log('- Invalid request_timeout');
  return undefined;
}