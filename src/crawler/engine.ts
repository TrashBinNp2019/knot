import { AxiosResponse, default as axios } from 'axios';
import { Client } from '../general/abstract_client.js';
import { crawlerConfig as config } from '../general/config/config_singleton.js';
import { inspect } from './inspect.js';
import { store } from './state/store.js';
import * as pausable from './state/pausableSlice.js';
import * as general from './state/generalStatsSlice.js';
import { generateIps, parseTime } from '../general/utils.js';

function log(...args: any[]) {
  store.dispatch(general.log(args));
}

function examined(count: number) {
  store.dispatch(general.examined({ count }));
}

function validated() {
  store.dispatch(general.valid({ count: 1 }));
}

function paused() {
  store.dispatch(pausable.paused({}));
}

function resumed() {
  store.dispatch(pausable.resumed({}));
  store.dispatch(general.resetTime({}));
}

/* c8 ignore next 7 */
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
  let run_until: number;
  let break_after: boolean;
  if (options.run_for !== undefined) {
    run_until = Date.now() + parseTime(options.run_for);
    break_after = true;
  }
  
  log('Starting');

  while (repetitions-- !== 0 && !(break_after && Date.now() > run_until)) {
    if (targets.length > config().targets_cap) {
      log('Target cap exceeded - dropping');
      targets = [];
    }

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
      paused();
      yield;
      resumed();
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
  const e = result.reason;
  if (e.code !== 'ECONNABORTED' &&
  e.code !== 'EADDRNOTAVAIL' &&
  e.code !== 'ENETUNREACH' &&
  e.code !== 'EHOSTUNREACH' &&
  e.code !== 'ECONNREFUSED') {
    log('Unusual error:', e.code);
  }
}

function handleConnection(result: PromiseFulfilledResult<{ 
  res: { data: Buffer, headers: { [key: string]: string } }; target: string; 
}>, db: Client): string[] {
  let { target, res } = result.value;
  
  const { host, links, imgs } = inspect(res, target, db);
  log({ 
    title: host.title, 
    addr: host.addr, 
    contents_length: host.contents.length, 
    keywords_length: host.keywords.length, 
    images_found: imgs.length,
  });
  validated();
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
