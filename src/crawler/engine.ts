import { AxiosResponse, default as axios } from 'axios';
import { Client } from '../general/abstract_client.js';
import { Events } from './interface.js';
import { crawlerConfig as config } from '../general/config/config_singleton.js';
import { inspect } from './inspect.js';
import { store } from './state/store.js';
import * as pausable from './state/pausableSlice.js';
import * as targets from './state/targetsSlice.js';

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
export async function start(options: StartOptions) {
  let db = options.db;
  let repetitions = options.repetitions ?? -1;
  // TODO implement
  let run_for = options.run_for ?? -1;

  if (store.getState().pausable.paused) {
    log('Resuming');
    store.dispatch(pausable.resumed({}));
    pause();
  } else {
    log('Starting');
    options.targets?.forEach(target => {
      store.dispatch(targets.push({ target }));
    });
  }

  while (repetitions !== 0 && !store.getState().pausable.pausePending) {
    store.dispatch(targets.shift({}));

    if (store.getState().targets.curr.length === 0) {
      log('No targets detected');
      break;
    }
    
    await crawl(db);
    examined(store.getState().targets.curr.length);
    repetitions--;
  }

  if (store.getState().pausable.pausePending) {
    log('Paused');
    store.dispatch(pausable.paused({}));
    pause();
  } else {
    log('Finished');
    store.dispatch(targets.clear({}));
  }
}

/**
 * Scan targets for any web pages and new targets, passing results to a db client
 * @param db Database client
 */
export async function crawl(db?: Client) {
  await Promise.allSettled(validate(store.getState().targets.curr).map(async target => ({ 
    res: await axios.get(target, { timeout: config.request_timeout }), 
    target,
  }))).then(async results => {
    handleResults(results, db);
  }).catch(e => {
    log(e.message);
  });
}

function handleResults(results: PromiseSettledResult<{ res: AxiosResponse<any, any>; target: string; }>[], db: Client) {
  results.forEach(result => {
    if (result.status === 'fulfilled') {
      handleConnection(result, db);
    } else {
      handleError(result);
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

function handleConnection(result: PromiseFulfilledResult<{ res: AxiosResponse<any, any>; target: string; }>, db: Client) {
  let { target, res } = result.value;
  inspect(res, target, db)
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

function validate(targets: string[]) {
  targets = targets.map(target => {
    if (!target.startsWith('http://') && !target.startsWith('https://')) {
      return `http://${target}`;
    }
    return target;
  });

  return targets;
}

