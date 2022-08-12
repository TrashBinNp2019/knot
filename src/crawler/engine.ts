import { AxiosResponse, default as axios } from 'axios';
import * as cheerio from 'cheerio';
import { Client, Host } from '../general/abstract_client.js';
import { Events } from './interface.js';
import { crawlerConfig as config } from '../general/config/config_singleton.js';
import jsdom from 'jsdom';
const { JSDOM } = jsdom;

const CONTENT_TAGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'li'];
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
 * Resolves hyperlink relative to the base url.
 * @example resolve('/foo/bar', 'http://example.com') => 'http://example.com/foo/bar'
 * @param hl Hyperlink to resolve
 * @param base Base URL to append to
 * @returns Combination of base and url or undefined if it's equal to base
 */
export function toAbsolute(hl:string, base:string):string | undefined {
  if (hl.includes('#') || hl.length === 0) {
    return undefined;
  }
  if (!hl.startsWith('http')) {
    if (hl.startsWith('/')) {
      let ind = base.search(/[^:\/]\//);
      if (ind !== -1) {
        return base.substring(0, ind + 1) + hl;
      } else {
        return base + hl;
      }
    } else if (hl.startsWith('?')) {
      let skel = base.split('?')[0].split('#')[0];
      return skel + hl;
    } else if (!/[^:\/]\//.test(base)) {
      return base + '/' + hl;
    } else {
      return base.slice(0, base.lastIndexOf('/') + 1) + hl;
    }
  } else {
    return hl;
  }
}

export class StartOptions {
  // TODO documentate
  db?: Client;
  targets?: string[];
  repetitions?: number;
  generate_random_targets?: boolean;
  // TODO "4h" or "4m" or "4s" (parse in a separate tested function) 
  // run_for?: string;
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

  if (paused) {
    log('Resuming');
    paused = false;
    pause();
  }

  function generate(count:number) {
    return Array(count).fill(0).map(() => generateIp());
  }

  while (repetitions !== 0 && !pauseRequested) {
    if (targets.length === 0) {
      if (generate_random_targets) {
        targets = generate(config.targets_cap);
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
        new_targets = [...new_targets, ...generate(config.targets_cap - new_targets.length)];
      }
    } else {
      log('Too many targets detected, dropping');
      new_targets = Array(config.targets_cap).fill(0).map(() => generateIp());
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
      }
      return target;
    });
    let promises = targets.map(async (target) => {
      try {
        let response = await axios.get(target, { timeout: config.request_timeout });
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
 * @example 
 * inspect({ 
    data: Buffer.from('<html><body><p>Hello</p></body></html>',
    headers: { 
      'content-type': 'text/html' 
    },
      }, 
    'http://example.com/2',
    ['http://example.com/1', 'http://example.com/2'],
    {
      test: async () => undefined,
      push: (host) => {console.log(host)},
    }
  );
* @param res Response object to inspect. Should contain data as a Buffer and headers in form of an object.
* @param source Response source
* @param targets Array to append any discovered links to
*/
export function inspect(res: { data:Buffer, headers:{ [key: string]: string } }, source: string, targets?: string[], db?:Client ) {
  let $ = cheerio.load(res.data);
  
  if (res.headers['content-type'] !== undefined && !res.headers['content-type'].includes('text/html')) {
    log('Unknown content type', res.headers['content-type']);
    return;
  }
  
  // Initiate fields
  let title = '';
  let contents = '';
  let keywords = '';
  
  // Check source
  if (source.length > 120) {
    log('A source is too long!');
    return;
  }

  // Search for contents and format them
  CONTENT_TAGS.forEach((tag) => {
    $(tag).each((ind, elem) => {
      if ($(elem).text() !== undefined && $(elem).text().length > 0) {
        contents += $(elem).text() + ' ';
      }
    });
  });
  
  // If nothing was found on the page, try running scripts
  if (!/[^\s]/.test(contents) && config.unsafe) {
    const { window } = new JSDOM(res.data, {
      runScripts: "dangerously",
      resources: "usable",
      pretendToBeVisual: true,
    });
    contents = '';
    CONTENT_TAGS.forEach((tag) => {
      window.document.body.querySelectorAll(tag).forEach((elem) => {
        if (elem.textContent !== undefined && elem.textContent.length > 0) {
          contents += elem.textContent + ' ';
        }
      });
    });

    log(`Running scripts generated ${contents.length} symbols`);
    
    const links:string[] = [];
    window.document.body.querySelectorAll('[href]').forEach(val => {
      if (val.getAttribute('href')) {
        links.push(val.getAttribute('href'));
      }
    });    
    
    $ = cheerio.load(`<head>${window.document.head.innerHTML}</head><body>${window.document.body.innerHTML}</body>`);
    window.close();
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
  contents = contents.replace(/\s+/g, ' ');
  if (contents.length > 65534) {
    contents = contents.substring(0, 65534);
  }
  contents = contents.substring(0, contents.lastIndexOf(' '));
  
  // Search for title and format it
  title = $('title').text();
  let index = 1;
  while (!title && index <= 6) {
    title = $('h' + index).first().text();
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
  title = title.replace(/\s+/g, ' ');
  
  // TODO parse forms?
  // Search for links
  $('[href]').each((i, elem) => {
    ifDefined(elem.attribs.href, val => {
      val = toAbsolute(val, source);
      if (targets !== undefined && targets.indexOf(val) === -1) {
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
  
  keywords = keywords.replace(/\s+/g, ' ');
  keywords += ' ';
  keywords = keywords.substring(0, 255);
  keywords = keywords.substring(0, keywords.lastIndexOf(' '));
  
  log({ title: title, addr: source, contents_length: contents.length, keywords_length: keywords.length });
  if (db !== undefined) {
    db.push({ title: title, addr: source, contents: contents, keywords: keywords});
  }
  valid();
}

