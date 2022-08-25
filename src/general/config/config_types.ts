import * as fs from 'fs';
import { parseTime } from '../utils.js';
import { store } from '../../crawler/state/store.js';
import { log } from '../../crawler/state/generalStatsSlice.js';

export class Readable {
  public static read(path: string): Readable {
    ensureExists(path);
    return ensureValid(fs.readFileSync(path, 'utf8'));
  };
}

export class Writable {
  write(path: string) {
    fs.writeFileSync(path, JSON.stringify(this.writeExcluded(), null, 2));
  }
  
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
  
  constructor(data: any) {
    super();
    
    let to = parseTime(data.request_timeout);
    if (to === undefined && data.request_timeout !== undefined) {
      store.dispatch(log(['Invalid request_timeout']));
    }

    /* c8 ignore next */
    this.unsafe = data.unsafe ?? process.env.UNSAFE ?? false;
    this.request_timeout = to ?? 5000;
    this.targets_cap = parseInt(data.targets_cap, 10) || 1000;
    this.use_web_interface = data.use_web_interface ?? false;
    this.web_interface_port = parseInt(data.web_interface_port, 10) || 8081;
    this.log_to_console = data.log_to_console ?? false;
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
  
  constructor(data: any) {
    super();
    /* c8 ignore next */
    this.port = parseInt(process.env.PORT, 10) || parseInt(data.port, 10) || 8080;
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
  
  constructor(data: any) {
    super();
    
    /* c8 ignore next 4 */
    this.user = data.user ?? process.env.PG_USER ?? 'postgres';
    this.password = data.password ?? process.env.PG_PASSWORD ?? 'postgres';
    this.host = data.host ?? process.env.PG_HOST ?? 'localhost';
    this.database = data.database ?? 'postgres';
    this.port = parseInt(data.port, 10) || 5432;
  }
  
  public static read(): PostgresConfig {
    return new PostgresConfig(Readable.read('config/postgres-config.json'));
  }
  
  write(): void {
    super.write('config/postgres-config.json');
  }
}

export function ensureExists(path: string) {
  if (!fs.existsSync(path)) {
    fs.writeFileSync(path, '{\n}');
  }
}

export function ensureValid(data: string) {
  try {
    return JSON.parse(data);
  } catch(e) {
    store.dispatch(log(['Config error: ', e.message]));
    return {};
  }
}

export function allDefined(obj: any, keys: string[]) {
  for (let key of keys) {
    if (obj[key] === undefined) {
      store.dispatch(log(`${key} undefined!`));
      return false;
    }
  }
  return true;
}

export function allStrings(obj: any, keys: string[]) {
  for (let key of keys) {
    if (typeof obj[key] !== 'string') {
      store.dispatch(log(`${key} isn't a string!`));
      return false;
    }
  }
  return true;
}
