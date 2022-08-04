import { AxiosResponse, default as axios } from 'axios';
import * as cheerio from 'cheerio';
import { Client, Host } from '../general/abstract_client.js';
import { Events } from './interface.js';
import * as config from './config.js';

let targets:string[] = [];
let callbacks:Map<string, ((...args:any) => void)[]> = new Map();
for (const key in Events) {
  callbacks.set(key, []);
}

function log(...args:any[]) {
  console.log('-', ...args);
  callbacks.get(Events.log).forEach(callback => callback(...args));
}

function examined(count: number) {
  callbacks.get(Events.examined).forEach(callback => callback(count));
}

function valid() {
  callbacks.get(Events.valid).forEach(callback => callback(1));
}

/**
 * Adds provided argument to callback list for the event.
 * @param event Event to add callback to. Must be a key in Events.
 * @param callback Callback to add
 */
export function on(event:string, callback: (...args:any) => void) {
  if (!callbacks.has(event)) {
    throw new Error('Unknown event: ' + event);
  }

  callbacks.get(event).push(callback);
}

/**
* If arg is defined, call the callback with arg.
* @param arg Value to check
* @param callback If defined called with arg
*/
function ifDefined<T>(arg:T | undefined, callback: (arg:T) => void) {
  if (arg !== undefined) {
    callback(arg);
  }
}

/**
* Generate a random IP address without any validity checks.
* @returns IP address
*/
function generateIp():string {
  return `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
}

/**
* Recursively crawl given targets and any discovered ones.
* @param targets Array of targets to crawl
* @param depth Number of recusive calls to perform. -1 for unlimited
*/
export async function crawl(targets:string[], db:Client, depth:number = -1) {
  let new_targets:string[] = [];
  try {
    targets = targets.map(target => {
      if (!target.startsWith('http')) {
        return `http://${target}`;
      }   return target;
    });
    let promises = targets.map(async (target) => {
      try {
        let response = await axios.get(target, { timeout: config.timeout() });
        return { res: response, target: target };
      }
      catch (e:any) {
        if (
          e.code !== 'ECONNABORTED' && 
          e.code !== 'EADDRNOTAVAIL' && 
          e.code !== 'ENETUNREACH' &&
          e.code !== 'EHOSTUNREACH' && 
          e.code !== 'ECONNREFUSED'
        ) { 
          log(target, 'Unusual error:', e.code);
        }
        return;
      }
    });        
    
    (await Promise.all(promises)).forEach((p:{ res:AxiosResponse, target:string } | undefined) => {
      ifDefined(p, (pair) => {
        const source = pair.target;
        const res = pair.res;
        inspect(res, source, new_targets, db); 
      });
    })
  } catch (e:any) {
    log(e.code ?? e.message);
  }
  if (depth === -1 || depth > 1) {
    if (new_targets.length !== 0) {
      log(`Detected ${new_targets.length} new targets`);
    }
    if (new_targets.length < config.targetsCap()) {
      new_targets = [...new_targets, ...Array(config.targetsCap() - new_targets.length).fill(0).map(() => generateIp())];
    } else {
      log('Too many targets detected, dropping');
      new_targets = Array(config.targetsCap()).fill(0).map(() => generateIp());
    }
    examined(targets.length);
    await crawl(new_targets, db, depth === -1? -1 : depth - 1);
  }
}

/**
* Inspect the response and extract the title and futher possible targets
* @param res AxiosResponse to inspect
* @param source Response source
* @param targets Array to append any discovered targets to
*/
export function inspect(res: AxiosResponse<any, any>, source: string, targets: string[], db:Client ) {
  const $ = cheerio.load(res.data);
  
  // Initiate fields
  let title = $('title').text();
  let contents = '';
  
  // Check source
  if (source.length > 120) {
    log('A source is too long!');
    return;
  }
  
  // Search for title and format it
  let index = 1;
  while (!title && index <= 6) {
    title = $(`h${index}`).text();
    index++;
  }
  if (!title) {
    title = source;
    if (title === undefined) {
      title = 'unknown';
    }
  }
  if (title.split(' ').length > 5) {
    title = title.split(' ').slice(0, 5).join(' ') + '...';
  } else if (title.length > 100) {
    title = title.substring(0, 100) + '...';
  }
  title = title.replace(/[\n'"`]+/gi, ' ');
  title = title.replace(/\s+/g, ' ');
  
  // Search for contents and format them
  for (let i = 1; i <= 6; i++) {
    contents += $(`h${i}`).text() + ' ';
  }
  contents += $('p').text();
  contents = contents.replace(/[\n'"`]+/gi, ' ');
  contents = contents.replace(/\s+/g, ' ');
  contents = contents.substring(0, 5000);
  contents = contents.substring(0, contents.lastIndexOf(' '));
  
  // Search for links
  $('[href]').each((i, elem) => {
    const href = $(elem).attr('href');
    ifDefined(href, val => {
      val = val.substring(val.indexOf('?') ?? val.length);
      val = val.substring(val.indexOf('#') ?? val.length);
      if (val.startsWith('http') && targets.indexOf(val) === -1) {
        targets.push(val);
      }
    });
  });

  log({ title: title, addr: source, contents_length: contents.length });
  db.push({ title: title, addr: source, contents: contents});
  valid();
}
