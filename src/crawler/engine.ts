import { AxiosResponse, default as axios } from 'axios';
import { Client } from '../general/abstract_client.js';
import { Events } from './interface.js';
import { crawlerConfig as config } from '../general/config/config_singleton.js';
import { inspect } from './inspect.js';
import { store } from './state/store.js';
import * as pausable from './state/pausableSlice.js';
import { generateIps } from '../general/utils.js';

let listeners: Map<string, ((...args: any) => void)[]> = new Map();

export function clearListeners() {
  for (const key in Events) {
    if (Events.hasOwnProperty(key)) {
      listeners.set(Events[key], []);
    }
  }
};
clearListeners();

function log(...args: any[]) {
  if (config().log_to_console) { 
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
  listeners.get(Events.pause).forEach(callback => callback());
}

/**
* Connects listener to the event.
* @param event Event to add listener to. Must be a key in Events
* @param callback Listener to add
*/
export function on(event: string, callback: (...args: any) => void) {
  if (!listeners.has(event)) {
    throw new Error('Unknown event: ' + event);
  }
  
  listeners.get(event).push(callback);
  return this;
}

export class StartOptions {
  db?: Client;
  repetitions?: number;
  targets?: string[];
  generate_random_targets?: boolean;
  run_for?: string | number;
}

/**
* Starts the crawler.
* @param options Options for the crawler.
* @returns Array of targets, discovered or generated, after the last step
*/
export async function* generate(options: StartOptions) {
  let db = options.db;
  let repetitions = options.repetitions ?? -1;
  let targets = options.targets ?? [];
  // TODO implement
  let run_for = options.run_for ?? -1;
  
  if (store.getState().pausable.paused) {
    log('Resuming');
    store.dispatch(pausable.resumed({}));
    pause();
  } else {
    log('Starting');
  }

  while (repetitions-- !== 0 && !store.getState().pausable.pausePending) {
    if (targets.length < config().targets_cap) {
      if (config().generate_random_targets) {
        targets = generateIps(config().targets_cap - targets.length);
      } else if (targets.length === 0) {
        log('No targets detected');
        break;
      }
    }
    
    let amount = targets.length;
    targets = await crawl(targets, db) || [];
    examined(amount);
        
    if (store.getState().pausable.pausePending) {
      log('Paused');
      store.dispatch(pausable.paused({}));
      pause();
      yield;
      log('Resuming');
    }
  }

  log('Finished');
}

/**
* Scan targets for any web pages and new targets, passing results to a db client
* @param db Database client
*/
export async function crawl(targets: string[], db?: Client): Promise<string[]> {
  try {
    return handleResults((await Promise.allSettled(validate(targets).map(async target => ({ 
      res: await axios.get(target, { timeout: config().request_timeout }), 
      target,
    })))), db);
  } catch (e) {
    log(e.message);
  };
}

function handleResults(results: PromiseSettledResult<{ res: AxiosResponse<any, any>; target: string; }>[], db: Client): string[] {
  return results.flatMap(result => {
    if (result.status === 'fulfilled') {
      return handleConnection(result, db);
    } else {
      handleError(result);
      return [];
    }
  });
}

function handleError(result: PromiseRejectedResult) {
  // TODO treat err bad response as valid ? perhaphs
  const e = result.reason;
  if (e.code !== 'ECONNABORTED' &&
  e.code !== 'EADDRNOTAVAIL' &&
  e.code !== 'ENETUNREACH' &&
  e.code !== 'EHOSTUNREACH' &&
  e.code !== 'ECONNREFUSED') {
    // if (e.code === 'ERR_BAD_RESPONSE') {
    //   console.log(e);
    // }
    log('Unusual error:', e.code);
  }
}

function handleConnection(result: PromiseFulfilledResult<{ 
  res: { data: Buffer, headers: { [key: string]: string } }; target: string; 
}>, db: Client): string[] {
  let { target, res } = result.value;
  
  const { host, links } = inspect(res, target, db);
  log({ title: host.title, addr: host.addr, contents_length: host.contents.length, keywords_length: host.keywords.length });
  valid();
  return links;
}

function validate(targets: string[]) {
  targets = targets.map(target => {
    if (!target.startsWith('http://') && !target.startsWith('https://')) {
    return `http://${target}`;
  }
  return target;
});

return targets;
}

