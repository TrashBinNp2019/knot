import { AxiosResponse, default as axios } from 'axios';
import { Client } from '../general/abstract_client.js';
import { Events } from './interface.js';
import { crawlerConfig as config } from '../general/config/config_singleton.js';
import { inspect } from './inspect.js'
import { generateIps } from '../general/utils.js';

let paused = false;
let pauseRequested = false;
let listeners:Map<string, ((...args:any) => void)[]> = new Map();

export function clearListeners() {
  for (const key in Events) {
    listeners.set(key, []);
  }
};
clearListeners();

function log(...args:any[]) {
  if (config.log_to_console) { 
    console.log('-', ...args);
  }
  listeners.get(Events.log).forEach(callback => callback(...args));
}

function examined(count: number) {
  listeners.get(Events.examined).forEach(callback => callback(count));
}

function valid() {
  listeners.get(Events.valid).forEach(callback => callback(1));
}

function pause() {
  listeners.get(Events.pause).forEach(callback => callback(paused));
}

export function isPaused(flag?:boolean) {
  if (flag !== undefined) {
    pauseRequested = flag;
  }
  return paused;
}

/**
 * Connects listener to the event.
 * @param event Event to add listener to. Must be a key in Events.
 * @param callback Listener to add
 */
export function on(event:string, callback: (...args:any) => void) {
  if (!listeners.has(event)) {
    throw new Error('Unknown event: ' + event);
  }

  listeners.get(event).push(callback);
  return this;
}

export class StartOptions {
  db?: Client;
  targets?: string[];
  repetitions?: number;
  generate_random_targets?: boolean;
  run_for?: string | number;
}

/**
 * Starts the crawler.
 * @param options Options for the crawler.
 * @returns Array of targets, discovered or generated, after the last step
 */
export async function start(options:StartOptions) {
  let db = options.db;
  let targets = options.targets ?? [];
  let repetitions = options.repetitions ?? -1;
  let generate_random_targets = options.generate_random_targets ?? true;
  // TODO implement
  let run_for = options.run_for ?? -1;

  if (paused) {
    log('Resuming');
    paused = false;
    pause();
  }

  while (repetitions !== 0 && !pauseRequested) {
    if (targets.length === 0) {
      if (generate_random_targets) {
        targets = generateIps(config.targets_cap);
      } else {
        log('No targets detected');
        break;
      }
    }
    let new_targets = await crawl(targets, db);

    if (new_targets.length !== 0) {
      log(`Detected ${new_targets.length} new targets`);
    }
    if (new_targets.length < config.targets_cap) {
      if (generate_random_targets) {
        new_targets = [...new_targets, ...generateIps(config.targets_cap - new_targets.length)];
      }
    } else {
      log('Too many targets detected, dropping');
      new_targets = generateIps(config.targets_cap);
    }
    examined(targets.length);

    targets = new_targets;
    repetitions--;
  }

  if (pauseRequested) {
    log('Paused');
    paused = true;
    pauseRequested = false;
    pause();
  }
  return targets;
}

/**
* Scan targets for any web pages and new targets, passing results to a db client
* @param targets Array of targets to crawl
* @param db Database client
* @return 
*/
export async function crawl(targets:string[], db?:Client) {
  let new_targets:string[] = [];
  makeValid(targets);

  await Promise.allSettled(targets.map(async target => ({ 
    res: await axios.get(target, { timeout: config.request_timeout } ), 
    target,
  }))).then(async results => {
    handleResults(results, new_targets, db);
  }).catch(e => {
    log(e.message);
  });

  return new_targets;
}

function handleResults(results: PromiseSettledResult<{ res: AxiosResponse<any, any>; target: string; }>[], new_targets: string[], db: Client) {
  results.forEach(result => {
    if (result.status === 'fulfilled') {
      handleConnection(result, new_targets, db);
    } else {
      handleError(result);
    }
  });
}

function handleError(result: PromiseRejectedResult) {
  let e = result.reason;
  if (e.code !== 'ECONNABORTED' &&
    e.code !== 'EADDRNOTAVAIL' &&
    e.code !== 'ENETUNREACH' &&
    e.code !== 'EHOSTUNREACH' &&
    e.code !== 'ECONNREFUSED') {
    log('Unusual error:', e.code);
  }
}

function handleConnection(result: PromiseFulfilledResult<{ res: AxiosResponse<any, any>; target: string; }>, new_targets: string[], db: Client) {
  let { target, res } = result.value;
  inspect(res, target, new_targets, db)
    .then((host) => {
      log({
        title: host.title,
        addr: host.addr,
        contents_length: host.contents.length,
        keywords_length: host.keywords.length
      });
      valid();
    });
}

function makeValid(targets: string[]) {
  targets = targets.map(target => {
    if (!target.startsWith('http://') && !target.startsWith('https://')) {
      return `http://${target}`;
    }
    return target;
  });
}

