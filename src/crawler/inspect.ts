import * as cheerio from 'cheerio';
import { Client, Host } from '../general/abstract_client.js';
import { crawlerConfig as config } from '../general/config/config_singleton.js';
import { ifDefined, toAbsolute } from '../general/utils.js';
import jsdom from 'jsdom';
const { JSDOM } = jsdom;

const CONTENT_TAGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'li'];
const EMPTY_THRESHOLD = 15;

/**
 * Inspect the response and extract title, contents and futher possible targets
 * @example 
 * inspect({ 
 *     data: Buffer.from('<html><body><p>Hello</p></body></html>'),
 *     headers: { 'content-type': 'text/html', },
 *   }, 'http://example.com/2', ['http://example.com/1', 'http://example.com/2',],{
 *     test: async () => undefined,
 *     push: (host) => {console.log(host)},
 *   },
 * );
 * @param res Response object to inspect. Should contain data as a Buffer and headers in form of an object.
 * @param source Response source
 * @param db DB client to save results by
 */
export function inspect(
  res: { data: Buffer, headers: { [key: string]: string } }, 
  source: string, db?: Client 
): { host:Host, links:string[] } {
  let $: cheerio.CheerioAPI;
  $ = load(res, source);

  let links = findLinks($, source);
  
  // TODO if source is IP addr, do reverse DNS
  
  const host: Host = {
    title: getTitle($, source),
    addr: source,
    contents: getContents($, res),
    keywords: getKeywords(res.headers),
  }

  db?.push(host);
  return { host, links };
}

function load(res: { data: Buffer, headers: { [key: string]: string } }, source: string) {
  let $ = cheerio.load(res.data);

  if (isEmpty($) && config.unsafe) {
    $ = executeJS(res.data);
  }
  
  if (res.headers['content-type'] !== undefined && !res.headers['content-type'].includes('text/html')) {
    throw new Error('Unknown content type ' + res.headers['content-type']);
  }
  
  if (source.length > 120) {
    throw new Error('A source is too long!');
  }

  return $;
}

function getContents($: cheerio.CheerioAPI, res: { data: Buffer; headers: { [key: string]: string; }; }): string {
  let contents = '';
  
  CONTENT_TAGS.forEach((tag) => {
    $(tag).each((ind, elem) => {
      if ($(elem).text() !== undefined && $(elem).text().length > 0) {
        contents += $(elem).text() + ' ';
      }
    });
  });

  contents += getMetas($);

  contents = contents.replace(/\s+/g, ' ');
  if (contents.length > 65534) {
    contents = contents.substring(0, 65534);
  }
  contents = contents.substring(0, contents.lastIndexOf(' '));

  return contents;
}

function executeJS(data: Buffer) {
  const { window } = new JSDOM(data, {
    runScripts: "dangerously",
    resources: "usable",
    pretendToBeVisual: true
  });

  let $ = cheerio.load(`<head>${window.document.head.innerHTML}</head><body>${window.document.body.innerHTML}</body>`);
  window.close();

  return $;
}

function isEmpty($: cheerio.CheerioAPI): boolean {
  let count = EMPTY_THRESHOLD;

  return CONTENT_TAGS.find((tag) => {
    return $(tag).get().find(elem => {
      count -= $(elem).text()?.length ?? 0;
      return count < 0;
    }, 0) !== undefined;
  }) === undefined;
}

function getMetas($: cheerio.CheerioAPI) {
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
  return extras;
}

function getKeywords(headers: { [key: string]: string; }) {
  let keywords = headers['x-powered-by'] ?? '';
  keywords += headers['server'] ?? '';

  keywords = keywords.replace(/\s+/g, ' ');
  keywords += ' ';
  keywords = keywords.substring(0, 255);
  keywords = keywords.substring(0, keywords.lastIndexOf(' '));

  return keywords;
}

function findLinks($: cheerio.CheerioAPI, source: string): string[] {
  return $('[href]').get().reduce((prev, elem) => {
    ifDefined(toAbsolute($(elem).attr('href'), source))((arg) => {
      prev.push(arg);
    });
    return prev;
  }, []);
}

function getTitle($: cheerio.CheerioAPI, source: string) {
  let title = $('title').text();

  let index = 1;
  while (!title && index <= 6) {
    title = $('h' + index).first().text();
    index++;
  }
  if (!title) {
    title = $('meta[name="title"]').attr('content') ?? source ?? 'unknown';
  }

  if (title.split(' ').length > 5) {
    title = title.split(' ').slice(0, 5).join(' ') + '...';
  } else if (title.length > 100) {
    title = title.substring(0, 100) + '...';
  }
  title = title.replace(/\s+/g, ' ');

  return title;
}
