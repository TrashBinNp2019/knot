import * as fs from 'fs';
import { parseTime } from '../utils.js';

// Interfaces don't work smh :/
class Readable {
  public static read(path:string): Readable {
    ensureExists(path);
    return ensureValid(fs.readFileSync(path, 'utf8'));
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
  public generate_random_targets: boolean;
  
  constructor(data:any) {
    super();

    let to = parseTime(data.request_timeout);
    if (to === undefined) {
      console.log('Invalid request_timeout');
    }

    this.request_timeout = to ?? 5000;
    this.targets_cap = parseInt(data.targets_cap) || 1000;
    this.use_web_interface = data.use_web_interface ?? true;
    this.web_interface_port = parseInt(data.web_interface_port) || 8080;
    this.unsafe = data.unsafe ?? false;
    this.log_to_console = data.log_to_console ?? true;
    this.generate_random_targets = data.generate_random_targets ?? true;
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
    if (!allDefined(data, ['user', 'password', 'database']) || !allStrings(data, ['user', 'password', 'database'])) {
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
