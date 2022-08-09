import { AxiosResponse, default as axios } from 'axios';
import * as cheerio from 'cheerio';
import { Client, Host } from '../general/abstract_client.js';
import { Events } from './interface.js';
import * as config from './config.js';
import jsdom from 'jsdom';
const { JSDOM } = jsdom;

let paused = false;
let pauseRequested = false;

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

function pause() {
  callbacks.get(Events.pause).forEach(callback => callback(paused));
}

export function isPaused(flag?:boolean) {
  if (flag !== undefined) {
    pauseRequested = flag;
  }
  return paused;
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

export class StartOptions {
  db?: Client;
  targets?: string[];
  repetitions?: number
}

/**
 * Starts the crawler.
 * @param options DB client, targets array and repetitions count
 * @returns Array of targets, discovered or generated, after the last step
 */
export async function start(options:StartOptions) {
  let db = options.db;
  let targets = options.targets ?? [];
  let repetitions = options.repetitions ?? -1;

  if (paused) {
    log('Resuming');
    paused = false;
    pause();
  }

  while (repetitions !== 0 && !pauseRequested) {
    let new_targets = await crawl(targets, db);

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

  return new_targets;
}

/**
* Inspect the response and extract title, contents and futher possible targets
* @param res AxiosResponse to inspect
* @param source Response source
* @param targets Array to append any discovered targets to
*/
export function inspect(res: AxiosResponse<any, any>, source: string, targets: string[], db?:Client ) {
  const $ = cheerio.load(res.data);
  let forHrefs: (callback:(i:number, elem:{ val?:string }) => void) => void;

  if (res.headers['content-type'] !== undefined && !res.headers['content-type'].includes('text/html')) {
    log('Unknown content type', res.headers['content-type']);
    return;
  }
  
  // Initiate fields
  let title = $('title').text();
  let contents = '';
  let keywords = '';
  
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
    title = $('meta[name="title"]').attr('content');
  }
  if (!title) {
    title = source;
  }
  if (!title) {
    title = 'unknown';
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
    contents += ($(`h${i}`).text() ?? '') + ' ';
  }
  contents += $('p').text() ?? '';

  // If nothing was found on the page, try running scripts
  if (contents.replace(' ', '').length  === 0 && config.unsafe()) {
    const { window } = new JSDOM(res.data, {
      runScripts: "dangerously",
      resources: "usable",
      pretendToBeVisual: true,
    });
    contents = window.document.body.textContent;
    log(`Running scripts generated ${contents.length} symbols`);

    const links:string[] = [];
    window.document.body.querySelectorAll('[href]').forEach(val => {
      if (val.getAttribute('href')) {
        links.push(val.getAttribute('href'));
      }
    });    

    window.close();

    forHrefs = (callback) => {
      links.forEach((val, i) => {
        callback(i, { val: val });
      });
    }
  } else {
    forHrefs = (callback) => {
      $('[href]').each((i, elem) => {
        callback(i, { val: $(elem).attr('href') });
      })
    }
  }

  let pre = 0;
  let extras = $('meta[name="description"]').attr('content') ?? '';
  extras += $('meta[name="keywords"]').attr('content') ?? '';
  extras += $('meta[name="author"]').attr('content') ?? '';
  let post = extras.length;
  if (post > pre) {
    // log(`${post - pre} symbols gathered from plain meta tags`);
  }
  pre = post;
  extras += $('meta[property="og:site_name"] ').attr('content') ?? '';
  extras += $('meta[property="og:type"] ').attr('content') ?? '';
  extras += $('meta[property="og:title"] ').attr('content') ?? '';
  post = extras.length;
  if (post > pre) {
    // log(`${post - pre} symbols gathered from Open Graph meta tags`);
  }

  contents += extras;
  contents = contents.replace(/[\n'"`]+/gi, ' ');
  contents = contents.replace(/\s+/g, ' ');
  if (contents.length > 65534) {
    contents = contents.substring(0, 65534);
  }
  contents = contents.substring(0, contents.lastIndexOf(' '));

  // Search for links
  forHrefs((i, elem) => {
    const href = elem.val;
    ifDefined(href, val => {
      val = val.substring(0, val.indexOf('?') ?? val.length);
      val = val.substring(0, val.indexOf('#') ?? val.length);
      if (!val.startsWith('http')) {
        if (val.startsWith('/')) {
          let ind = source.search(/[^:\/]\//) + 1;
          if (ind !== -1) {
            val = source.substring(0, ind) + val;
          } else {
            val = source + '/' + val;
          }
        } else if (val.startsWith('#') || val.length === 0) {
          return;
        } else {
          val = source + val;
        }
      }
      // console.log(val);
      if (targets.indexOf(val) === -1) {
        targets.push(val);
      }
    });
  });

  // Search for keywords
  keywords += res.headers['x-powered-by'] ?? '';
  keywords += res.headers['server'] ?? '';
  if (keywords.length > 0) {
    // log(`${keywords.length} symbols gathered from headers`);
  }

  keywords = keywords.replace(/[\n'"`]+/gi, ' ');
  keywords = keywords.replace(/\s+/g, ' ');
  keywords = keywords.substring(0, 255);
  keywords = keywords.substring(0, keywords.lastIndexOf(' '));

  log({ title: title, addr: source, contents_length: contents.length, keywords_length: keywords.length });
  if (db !== undefined) {
    db.push({ title: title, addr: source, contents: contents, keywords: keywords});
  }
  valid();
}
